from neo4j import GraphDatabase
from stanza.server import CoreNLPClient
import json

conversationID = 1372376279882862595


client = CoreNLPClient(annotators=['parse'], output_format="json")

driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "password"))
session = driver.session()

result = session.run("MATCH (n:Tweet)-[:In_Conversation]-(c:Conversation) WHERE c.id=$conv_id RETURN n.id as id, n.text as text", conv_id=conversationID)

for record in result:
    doc = client.annotate(record["text"])
    session.run("MATCH (tweet:Tweet) where tweet.id=$id SET tweet.stanford_json=$stanford_json", id=record['id'], stanford_json=json.dumps(doc))
    print(json.dumps(doc))
    print("done... \n\n")


driver.close()
