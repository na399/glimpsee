import requests
import json
from os.path import join, dirname
from dotenv import load_dotenv
from os import environ

dotenv_path = join(dirname(__file__), '.env')
load_dotenv(dotenv_path)

COMPUTER_VISION_KEY = environ.get("COMPUTER_VISION_KEY")
FACE_KEY = environ.get("FACE_KEY")

def getTags(url):
    uri_base = 'https://westeurope.api.cognitive.microsoft.com'
    subscription_key = COMPUTER_VISION_KEY

    headers = {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': subscription_key,
    }
    params = {
        'visualFeatures': 'Tags,Faces,Color',
        'language': 'en',
    }
    body = {'url': url}

    try:
        # Execute the REST API call and get the response.
        response = requests.request('POST', uri_base + '/vision/v1.0/analyze', json=body, data=None, headers=headers,
                                    params=params)
        return json.loads(response.text)

    except Exception as e:
        print('Error:')
        print(e)




def getFaces(url):
    uri_base = 'https://westeurope.api.cognitive.microsoft.com'
    subscription_key = FACE_KEY

    headers = {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': subscription_key,
    }
    params = {
        'returnFaceId': 'true',
        'returnFaceLandmarks': 'false',
        'returnFaceAttributes': 'age,gender,emotion,accessories,blur,exposure,noise',
    }
    body = {'url': url}

    try:
        # Execute the REST API call and get the response.
        response = requests.request('POST', uri_base + '/face/v1.0/detect', json=body, data=None, headers=headers,
                                    params=params)
        return json.loads(response.text)

    except Exception as e:
        print('Error:')
        print(e)
