from stanza.server import CoreNLPClient

with CoreNLPClient(annotators=['parse'], output_format="json") as client:
    doc = client.annotate("If I went to the mall and ate mushrooms, I would be very happy for the rest of the day")
    print(doc)

quit()

nlp = stanza.Pipeline('en') # This sets up a default neural pipeline in English
doc = nlp("Barack Obama was born in Hawaii.  He was elected president in 2008.")
doc.sentences[0].print_dependencies()
