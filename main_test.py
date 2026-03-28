import requests

# Test server health
resp = requests.get('http://127.0.0.1:8000/health')
print('Health:', resp.json())

# Test STT endpoint with a sample audio file
# Place a sample file at 'sample.wav' or update the path
with open('sample.wav', 'rb') as f:
    files = {'file': ('sample.wav', f, 'audio/wav')}
    resp = requests.post('http://127.0.0.1:8000/stt', files=files)
    print('STT Response:', resp.json())
