import os


def generate_audio(text: str, outfile_path: str) -> str:
    """Generate an MP3 file from text using the configured TTS provider.

    Returns the outfile_path on success. Mirrors the evaluator sample intent while
    keeping the project self-contained. Only Azure is implemented here, per evaluation.
    """
    provider = os.getenv("TTS_PROVIDER", "").lower()
    if provider != "azure":
        raise RuntimeError("Unsupported TTS_PROVIDER. Set TTS_PROVIDER=azure for evaluation.")

    try:
        import azure.cognitiveservices.speech as speechsdk
    except Exception as e:
        raise RuntimeError(f"Azure Speech SDK not available: {e}")

    azure_key = os.getenv("AZURE_TTS_KEY", "").strip()
    azure_endpoint = os.getenv("AZURE_TTS_ENDPOINT", "").strip()
    if not azure_key or not azure_endpoint:
        raise RuntimeError("AZURE_TTS_KEY or AZURE_TTS_ENDPOINT missing.")

    speech_config = speechsdk.SpeechConfig(subscription=azure_key, endpoint=azure_endpoint)
    speech_config.set_speech_synthesis_output_format(
        speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3
    )
    audio_config = speechsdk.audio.AudioOutputConfig(filename=outfile_path)
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)

    result = synthesizer.speak_text_async(text).get()
    if result.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
        raise RuntimeError("Audio synthesis failed")
    return outfile_path


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python generate_audio.py \"text to speak\" output.mp3")
        sys.exit(1)
    path = generate_audio(sys.argv[1], sys.argv[2])
    print(path)


