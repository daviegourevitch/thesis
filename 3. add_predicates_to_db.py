from neo4j import GraphDatabase
import subprocess
import os

def runPropSInPython2():
    python3_command = "C:\Python27\python ./run_parse_props.py ./stanford_output.json -t --oie --corenlp-json-input"
    new_env = os.environ.copy()
    new_env.update({"PYTHONPATH": "."})
    process = subprocess.Popen(python3_command, shell=True, env=new_env)
    output, error = process.communicate()
    print(output)

driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "password"))
session = driver.session()

# conversationID = 1372376279882862595
# result = session.run("MATCH (n:Tweet)-[:In_Conversation]-(c:Conversation) WHERE c.id=$conv_id RETURN n.id as id, n.stanford_json as stanford_json", conv_id=conversationID)
result = session.run("MATCH (n:Tweet) RETURN n.id as id, n.stanford_json as stanford_json", conv_id=conversationID)

for record in result:
    open("stanford_output.json", mode="w+").close()
    file = open("stanford_output.json", mode="w+")
    file.write(record["stanford_json"])
    file.close()
    runPropSInPython2()


driver.close()
