from stanza.server import CoreNLPClient
import json
import subprocess
import os


def runPropSInPython2():
    python3_command = "C:\Python27\python ./run_parse_props.py ./toy.json -t --oie --corenlp-json-input"
    new_env = os.environ.copy()
    new_env.update({"PYTHONPATH": "."})
    process = subprocess.Popen(python3_command, shell=True, env=new_env)
    output, error = process.communicate()
    print(output)


client = CoreNLPClient(annotators=['parse'], output_format="json")

while True:
    sentence = input("Please input a sentence\n")
    doc = client.annotate(sentence)

    open("toy.json", mode="w+").close()
    file = open("toy.json", mode="w+")
    file.write(json.dumps(doc))
    file.close()

    runPropSInPython2()
