import urllib.request
import json
import urllib.parse
import time

API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQ4NmIzNzMzZmRkNzQ4M2Y4MTZhNDlmZWFmMDkwYzMyIiwiaCI6Im11cm11cjY0In0="
hubs = [
    "Visakhapatnam, Andhra Pradesh",
    "Vizianagaram, Andhra Pradesh",
    "Rajahmundry, Andhra Pradesh",
    "Kakinada, Andhra Pradesh",
    "Vijayawada, Andhra Pradesh",
    "Guntur, Andhra Pradesh",
    "Nellore, Andhra Pradesh",
    "Tirupati, Andhra Pradesh",
    "Kurnool, Andhra Pradesh",
    "Kadapa, Andhra Pradesh",
    "Anantapur, Andhra Pradesh"
]

results = []
for hub in hubs:
    url = f"https://api.openrouteservice.org/geocode/search?api_key={API_KEY}&text={urllib.parse.quote(hub)}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            if data and 'features' in data and len(data['features']) > 0:
                results.append({
                    "name": hub.split(',')[0],
                    "coordinates": data['features'][0]['geometry']['coordinates']
                })
    except Exception as e:
        print(f"Error for {hub}: {e}")
    time.sleep(1)

print(json.dumps(results, indent=2))
