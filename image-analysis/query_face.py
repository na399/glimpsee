import pydocumentdb.document_client as document_client

config = {
    'ENDPOINT': 'https://glimpsee.documents.azure.com',
    'MASTERKEY': 'QgjYe44Ktnn7rsFBjMlFmn6I8GzkCNNRGEGjbL5zMip1rXEOv9gZhbHpF9qDMUWsm2svlr4lDe0NApQUj65baA==',
    'DOCUMENTDB_DATABASE': 'picture',
    'DOCUMENTDB_COLLECTION': 'features'
};

# Initialize the Python DocumentDB client
client = document_client.DocumentClient(config['ENDPOINT'], {'masterKey': config['MASTERKEY']})

# Read databases and take first since id should not be duplicated.
db = next((data for data in client.ReadDatabases() if data['id'] == config['DOCUMENTDB_DATABASE']))

# Read collections and take first since id should not be duplicated.
collection = next((coll for coll in client.ReadCollections(db['_self']) if coll['id'] == config['DOCUMENTDB_COLLECTION']))

# Query them in SQL
options = {}
options['enableCrossPartitionQuery'] = True
options['maxItemCount'] = 2
options['enableScanInQuery'] = True



query = {'query': 'SELECT * FROM c WHERE c.tags[0].name = "tree"'}

query = {'query': """SELECT * FROM c WHERE c.tags[0].name = 'outdoor'
                      OR c.tags[1].name = 'outdoor'
                      OR c.tags[2].name = 'outdoor'
                      OR c.tags[3].name = 'outdoor'
                      OR c.tags[4].name = 'outdoor'"""}


# query = {'query': 'SELECT * FROM c WHERE c.creationTimeStamp = "2017-05-20T21:39:27Z"'}


result_iterable = client.QueryDocuments(collection['_self'], query, options)
results = list(result_iterable)

for result in results:
    print(result['url'])

with open('urls_image.txt', 'w') as f:
    for result in results:
        f.write('\''+ result['url']+'\',\n')


