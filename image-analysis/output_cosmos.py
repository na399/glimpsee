import pydocumentdb
import pydocumentdb.document_client as document_client
import cognitive_services
from os.path import join, dirname
from dotenv import load_dotenv
from os import environ

dotenv_path = join(dirname(__file__), '.env')
load_dotenv(dotenv_path)

DB_MASTERKEY = environ.get("DB_MASTERKEY")

config = {
    'ENDPOINT': 'https://glimpsee.documents.azure.com:443/',
    'MASTERKEY': DB_MASTERKEY,
    'DOCUMENTDB_DATABASE': 'glimpsee',
    'DOCUMENTDB_COLLECTION': 'collection1'
}

# Initialize the Python DocumentDB client
client = document_client.DocumentClient(config['ENDPOINT'], {'masterKey': config['MASTERKEY']})


# Read databases and take first since id should not be duplicated.
db = next((data for data in client.ReadDatabases() if data['id'] == config['DOCUMENTDB_DATABASE']))

# Read collections and take first since id should not be duplicated.
collection = next((coll for coll in client.ReadCollections(db['_self']) if coll['id'] == config['DOCUMENTDB_COLLECTION']))


with open('urls.txt', 'r') as f:
    blob_urls = [line.rstrip('\n') for line in f]


# %%timeit -r 1 -n 1
counter = 0
for url in blob_urls:
    result = cognitive_services.getTags(url)
    if(result['faces']):
        result['faceResults'] = cognitive_services.getFaces(url)
    result['url'] = url
    result['creationTimeStamp'] = cognitive_services.getTimeStamp(url)
    client.CreateDocument(collection['_self'], result)
    print(counter+1, url)
    counter += 1
