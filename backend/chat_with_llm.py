import os
import json
from typing import List, Dict, Any


def chat_with_llm(messages: List[Dict[str, str]]) -> Dict[str, Any]:
    """Minimal LLM chat wrapper following the sample repo contract.

    Uses environment variables to select the provider. For evaluation, Gemini is expected.
    This function is intentionally simple and returns a deterministic fallback if external
    access is not available, so the app remains functional offline.
    """
    provider = os.getenv("LLM_PROVIDER", "").lower()
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    # Fallback/local stub when no provider or offline
    if provider not in {"gemini", "gcp", "openai", "ollama"}:
        prompt = " ".join(m.get("content", "") for m in messages if m.get("role") == "user")
        return {
            "provider": provider or "none",
            "model": model,
            "choices": [{"message": {"role": "assistant", "content": f"[offline] Summary: {prompt[:400]}"}}]
        }

    try:
        if provider in {"gemini", "gcp"}:
            # Use Google Generative AI SDK if available
            try:
                import google.generativeai as genai
            except Exception as e:
                # Fallback deterministic response
                prompt = " ".join(m.get("content", "") for m in messages if m.get("role") == "user")
                return {
                    "provider": provider,
                    "model": model,
                    "choices": [{"message": {"role": "assistant", "content": f"[no-sdk] Summary: {prompt[:400]}"}}]
                }

            genai.configure()  # credentials via GOOGLE_APPLICATION_CREDENTIALS
            system = "\n".join(m["content"] for m in messages if m["role"] == "system")
            user_parts = [m["content"] for m in messages if m["role"] == "user"]
            prompt = (system + "\n" if system else "") + "\n\n".join(user_parts)
            model_obj = genai.GenerativeModel(model)
            resp = model_obj.generate_content(prompt)
            text = getattr(resp, "text", None) or "".join(getattr(c, "text", "") for c in getattr(resp, "candidates", []) or [])
            return {
                "provider": provider,
                "model": model,
                "choices": [{"message": {"role": "assistant", "content": text}}]
            }

        if provider == "ollama":
            # Call local Ollama if available
            import subprocess
            import tempfile
            prompt = "\n\n".join(m.get("content", "") for m in messages)
            with tempfile.NamedTemporaryFile("w", delete=False) as f:
                f.write(prompt)
                prompt_file = f.name
            model_name = os.getenv("OLLAMA_MODEL", "llama3")
            try:
                out = subprocess.check_output(["ollama", "run", model_name, prompt])
                text = out.decode("utf-8", errors="ignore")
            except Exception:
                text = f"[ollama-unavailable] {prompt[:400]}"
            return {
                "provider": provider,
                "model": model_name,
                "choices": [{"message": {"role": "assistant", "content": text}}]
            }

        # Generic fallback
        prompt = " ".join(m.get("content", "") for m in messages if m.get("role") == "user")
        return {
            "provider": provider,
            "model": model,
            "choices": [{"message": {"role": "assistant", "content": f"[generic] {prompt[:400]}"}}]
        }
    except Exception as e:
        # Never hard fail
        prompt = " ".join(m.get("content", "") for m in messages if m.get("role") == "user")
        return {
            "provider": provider,
            "model": model,
            "choices": [{"message": {"role": "assistant", "content": f"[error] {str(e)} | {prompt[:400]}"}}]
        }


if __name__ == "__main__":
    import sys
    sample_prompt = " ".join(sys.argv[1:]) or "Summarize this content."
    out = chat_with_llm([
        {"role": "system", "content": "You are a concise assistant."},
        {"role": "user", "content": sample_prompt}
    ])
    print(json.dumps(out, indent=2))


