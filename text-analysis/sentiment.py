import requests
import json

headers = {
    # Request headers
    'Content-Type': 'application/json',
    'Ocp-Apim-Subscription-Key': '7892808a06d44af7a91463712254bd42',
}

params = {
}

body = {
  "documents": [
    {
      "language": "en",
      "id": "string",
      "text": "I love Microsoft"
    }
  ]
}

try:
    # Execute the REST API call and get the response.
    response = requests.request('POST', "https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/sentiment?%s", json=body, data=None, headers=headers,
                                params=params)

    print(json.loads(response.text))

except Exception as e:
    print('Error:')
    print(e)




