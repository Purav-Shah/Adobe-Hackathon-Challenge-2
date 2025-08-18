import os
import json
import fitz
from bs4 import BeautifulSoup
import re
import pdfplumber
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from pathlib import Path
from typing import List, Dict, Any

class PDFProcessor:
    def __init__(self):
        """Initialize the PDF processor with integrated engines"""
        self.patterns = [
            r'^\d+\.\s+', r'^\d+\.\d+\s+', r'^Chapter\s+\d+', r'^[A-Z]\.\s+', r'^[IVX]+\.\s+',
            r'^Section\s+\d+', r'^Part\s+\d+', r'^Appendix\s+[A-Z]', r'^Table\s+\d+', r'^Figure\s+\d+',
            r'^[A-Z][A-Z\s\-]{5,}$'  # ALL CAPS
        ]
        
        # Initialize sentence transformer model if available; otherwise fall back to TF-IDF
        self.model = None
        self._tfidf_vectorizer = None
        try:
            from sentence_transformers import SentenceTransformer
            # Try to use a base model that will be downloaded
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            print("Sentence transformer model loaded successfully")
        except Exception as e:
            print(f"Could not load sentence transformer model (falling back to TF-IDF): {e}")
            self.model = None
            try:
                from sklearn.feature_extraction.text import TfidfVectorizer  # noqa: F401
                self._tfidf_vectorizer = None  # lazy init in similarity fn
            except Exception:
                self._tfidf_vectorizer = None

    def extract_sections(self, pdf_path: str) -> List[Dict[str, Any]]:
        """Extract sections from PDF using integrated engine logic"""
        try:
            doc = fitz.open(pdf_path)
            candidates = []
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                blocks = page.get_text('dict')
                all_spans = []
                
                for block in blocks.get('blocks', []):
                    if 'lines' in block:
                        for line in block['lines']:
                            for span in line['spans']:
                                text = span['text'].strip()
                                if not text or len(text) < 1 or len(text) > 200:
                                    continue
                                all_spans.append({
                                    'text': text,
                                    'font': span['font'],
                                    'size': span['size'],
                                    'flags': span.get('flags', 0),
                                    'bbox': list(span['bbox']),
                                    'page': page_num
                                })
                
                all_spans.sort(key=lambda s: (s['page'], s['bbox'][1], s['bbox'][0]))
                i = 0
                
                while i < len(all_spans):
                    current = all_spans[i]
                    merged_text = current['text']
                    merged_bbox = current['bbox'][:]
                    j = i + 1
                    
                    while j < len(all_spans):
                        next_span = all_spans[j]
                        if (next_span['page'] == current['page'] and
                            next_span['font'] == current['font'] and
                            abs(next_span['size'] - current['size']) < 0.5 and
                            next_span['flags'] == current['flags'] and
                            0 <= next_span['bbox'][1] - merged_bbox[3] < 10):
                            if (len(merged_text) < 30 or next_span['text'][0].islower() or not merged_text.endswith(('.', ':', ';'))):
                                merged_text += ' ' + next_span['text']
                                merged_bbox[2] = max(merged_bbox[2], next_span['bbox'][2])
                                merged_bbox[3] = next_span['bbox'][3]
                                j += 1
                                continue
                        break
                    
                    if len(merged_text) >= 5:
                        font_size = current['size']
                        is_bold = 'bold' in current['font'].lower() or (current['flags'] & 2**4)
                        pattern_score = 0
                        
                        for pattern in self.patterns:
                            if re.match(pattern, merged_text):
                                pattern_score += 10
                        
                        all_caps = merged_text.isupper() and len(merged_text) > 5
                        length_score = 3 if 8 <= len(merged_text) <= 60 else 1
                        score = 0
                        score += int(font_size > 0) * int(font_size)
                        score += 8 if is_bold else 0
                        score += pattern_score
                        score += 5 if all_caps else 0
                        score += length_score
                        
                        candidates.append({
                            'level': 'H1',  # temporary, will be replaced by clustering
                            'text': merged_text,
                            'page': current['page'],
                            'score': score,
                            'y': merged_bbox[1],
                            'font_size': font_size
                        })
                    i = j
            
            doc.close()
            
            # Assign heading levels
            candidates = self._assign_heading_levels(candidates)
            
            # Filter and clean headings
            final_headings = self._filter_headings(candidates)
            
            # Reconstruct phrases
            final_headings = self._reconstruct_phrases(final_headings)
            
            # Convert to section format
            sections = []
            for h in final_headings:
                sections.append({
                    'title': h['text'],
                    'level': h['level'],
                    'page': h['page'],
                    'content': self._extract_section_content(pdf_path, h['page'], h['text'])
                })
            
            return sections
            
        except Exception as e:
            print(f"Error extracting sections: {e}")
            return []

    def _assign_heading_levels(self, headings):
        """Assign heading levels based on font size clustering"""
        if not headings:
            return headings
        
        font_sizes = sorted({h['font_size'] for h in headings if 'font_size' in h}, reverse=True)
        level_map = {}
        
        for i, size in enumerate(font_sizes):
            if i == 0:
                level_map[size] = 'H1'
            elif i == 1:
                level_map[size] = 'H2'
            elif i == 2:
                level_map[size] = 'H3'
            elif i == 3:
                level_map[size] = 'H4'
            else:
                level_map[size] = 'H5'
        
        for h in headings:
            if 'font_size' in h:
                h['level'] = level_map.get(h['font_size'], 'H5')
        
        return headings

    def _filter_headings(self, headings):
        """Filter headings based on quality criteria"""
        filtered = []
        for h in headings:
            alnum_count = sum(c.isalnum() for c in h['text'])
            if alnum_count < 2:
                continue
            
            non_alnum_ratio = sum(not c.isalnum() and not c.isspace() for c in h['text']) / max(len(h['text']), 1)
            if non_alnum_ratio > 0.9:
                continue
            
            y = h.get('y', None)
            filtered.append({
                'level': h['level'],
                'text': h['text'],
                'page': h['page'],
                'y': y if y is not None else 0,
                'score': h.get('score', 0),
                'font_size': h.get('font_size', 0)
            })
        
        filtered.sort(key=lambda h: (h['page'], h['y']))
        return filtered

    def _reconstruct_phrases(self, headings):
        """Reconstruct fragmented heading phrases"""
        reconstructed = []
        i = 0
        
        while i < len(headings):
            h = headings[i]
            phrase = h['text']
            j = i + 1
            
            while (j < len(headings) and
                   len(headings[j]['text']) < 10 and
                   headings[j]['page'] == h['page'] and
                   headings[j]['level'] == h['level'] and
                   abs(headings[j]['y'] - h['y']) < 30):
                phrase += ' ' + headings[j]['text']
                j += 1
            
            reconstructed.append({
                'level': h['level'],
                'text': phrase.strip(),
                'page': h['page']
            })
            i = j
        
        return reconstructed

    def _extract_section_content(self, pdf_path: str, page_num: int, section_title: str) -> str:
        """Extract content for a specific section"""
        try:
            with pdfplumber.open(pdf_path) as pdf:
                if page_num < len(pdf.pages):
                    page = pdf.pages[page_num]
                    text = page.extract_text() or ""
                    
                    # Find the section content after the title
                    lines = text.split('\n')
                    content_start = -1
                    
                    for i, line in enumerate(lines):
                        if section_title.lower() in line.lower():
                            content_start = i + 1
                            break
                    
                    if content_start >= 0:
                        content_lines = lines[content_start:content_start + 20]  # Get next 20 lines
                        return '\n'.join(content_lines).strip()
                    else:
                        return text[:500]  # Return first 500 chars if section not found
                
                return ""
        except Exception as e:
            print(f"Error extracting section content: {e}")
            return ""

    def find_related_sections(self, current_sections: List[Dict], processed_dir: str) -> List[Dict]:
        """Find related sections from uploaded documents using integrated engine logic"""
        # Allow fallback path even if embedding model is not available
        
        try:
            related_sections = []
            
            # Get all processed documents
            processed_files = list(Path(processed_dir).glob("*.json"))
            
            for section in current_sections[:3]:  # Analyze first 3 sections
                section_text = section['title']
                if len(section_text) < 10:
                    continue
                
                # Find related sections across all documents
                for doc_file in processed_files:
                    with open(doc_file, 'r', encoding='utf-8') as f:
                        doc_data = json.load(f)
                    
                    for doc_section in doc_data['sections']:
                        if doc_section['title'] == section_text:
                            continue
                        
                        # Calculate similarity
                        similarity = self._calculate_similarity(section_text, doc_section['title'])
                        
                        if similarity > 0.3:  # Threshold for relevance
                            snippet = self._make_snippet(doc_section.get('content') or doc_section.get('title', ''))
                            related_sections.append({
                                'source_document': doc_data['filename'],
                                'section_title': doc_section['title'],
                                'similarity_score': similarity,
                                'page': doc_section['page'],
                                'snippet': snippet,
                                'relevance_explanation': self._generate_relevance_explanation(section_text, doc_section['title'])
                            })
            
            # Sort by similarity and return top results
            related_sections.sort(key=lambda x: x['similarity_score'], reverse=True)
            return related_sections[:5]  # Return top 5 related sections
            
        except Exception as e:
            print(f"Error finding related sections: {e}")
            return []

    def find_related_sections_for_section(self, section_text: str, processed_dir: str) -> List[Dict]:
        """Find related sections for a specific section text"""
        # Allow fallback path even if embedding model is not available
        
        try:
            related_sections = []
            processed_files = list(Path(processed_dir).glob("*.json"))
            
            for doc_file in processed_files:
                with open(doc_file, 'r', encoding='utf-8') as f:
                    doc_data = json.load(f)
                
                for doc_section in doc_data['sections']:
                    if doc_section['title'] == section_text:
                        continue
                    
                    similarity = self._calculate_similarity(section_text, doc_section['title'])
                    
                    if similarity > 0.3:
                        snippet = self._make_snippet(doc_section.get('content') or doc_section.get('title', ''))
                        related_sections.append({
                            'source_document': doc_data['filename'],
                            'section_title': doc_section['title'],
                            'similarity_score': similarity,
                            'page': doc_section['page'],
                            'snippet': snippet,
                            'relevance_explanation': self._generate_relevance_explanation(section_text, doc_section['title'])
                        })
            
            related_sections.sort(key=lambda x: x['similarity_score'], reverse=True)
            return related_sections[:3]
            
        except Exception as e:
            print(f"Error finding related sections for section: {e}")
            return []

    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate semantic similarity between two texts"""
        try:
            if self.model is not None:
                embeddings = self.model.encode([text1, text2])
                similarity = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
                return float(similarity)
            # Fallback to TF-IDF cosine similarity
            try:
                from sklearn.feature_extraction.text import TfidfVectorizer
                vectorizer = self._tfidf_vectorizer or TfidfVectorizer(stop_words='english', ngram_range=(1, 2))
                tfidf = vectorizer.fit_transform([text1, text2])
                sim = cosine_similarity(tfidf[0], tfidf[1])[0][0]
                # cache vectorizer to reuse vocabulary
                self._tfidf_vectorizer = vectorizer
                return float(sim)
            except Exception:
                # very naive lexical overlap as last resort
                s1 = set(w.lower() for w in text1.split())
                s2 = set(w.lower() for w in text2.split())
                if not s1 or not s2:
                    return 0.0
                overlap = len(s1 & s2) / float(len(s1 | s2))
                return overlap
        except Exception as e:
            print(f"Error calculating similarity: {e}")
            return 0.0

    def _generate_relevance_explanation(self, source_text: str, target_text: str) -> str:
        """Generate a brief explanation of why two sections are related"""
        try:
            # Simple heuristic-based explanation
            source_words = set(source_text.lower().split())
            target_words = set(target_text.lower().split())
            
            common_words = source_words.intersection(target_words)
            common_words = [w for w in common_words if len(w) > 3]  # Filter short words
            
            if len(common_words) > 0:
                return f"Shares key concepts: {', '.join(common_words[:3])}"
            else:
                return "Semantically related content based on AI analysis"
                
        except Exception as e:
            return "Related content identified through AI analysis"
    
    def _make_snippet(self, text: str) -> str:
        """Create a 2-4 sentence snippet from section content."""
        try:
            if not text:
                return ""
            clean = re.sub(r"\s+", " ", text).strip()
            parts = re.split(r"(?<=[.!?])\s+", clean)
            snippet = " ".join(parts[:4])
            if len(snippet) > 500:
                snippet = snippet[:497].rstrip() + "..."
            return snippet
        except Exception:
            return (text or "")[:200]
