# At the hand level, extrinsic (forearm) muscles are present only as tendons / palmar aponeurosis.
import json
S = json.load(open('assets/sections.json'))
EXTRINSIC = {'pl', 'fds', 'fdp', 'fpl', 'fcr', 'fcu', 'ed', 'edm', 'ei', 'epl', 'epb', 'apl', 'ecrl', 'ecrb', 'ecu', 'br'}
for s in S['ph_s1']['structs']:
    if s['kind'] == 'muscle' and s['key'] in EXTRINSIC:
        s['tendon'] = True
json.dump(S, open('assets/sections.json', 'w'))
print([(s['key'], s['tendon']) for s in S['ph_s1']['structs'] if s['kind'] == 'muscle'])
