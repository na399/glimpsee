from os.path import join, dirname
from dotenv import load_dotenv
from os import environ
from azure.storage import blob

dotenv_path = join(dirname(__file__), '.env')
load_dotenv(dotenv_path)

ACCOUNT_NAME = environ.get("ACCOUNT_NAME")
ACCOUNT_KEY = environ.get("ACCOUNT_KEY")

blob_service = blob.baseblobservice.BaseBlobService(account_name=ACCOUNT_NAME, account_key=ACCOUNT_KEY)

blob_urls = []

for aBlob in blob_service.list_blobs("photos-click"):
    blob_urls.append(blob_service.make_blob_url("photos-click", aBlob.name))

with open('urls.txt', 'w') as f:
    for s in blob_urls:
        f.write(s + '\n')

# To read the files
# with open('urls.txt', 'r') as f:
#     blob_urls = [line.rstrip('\n') for line in f]
