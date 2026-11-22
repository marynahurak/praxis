# BodyParts3D name -> (key, kind). kind: muscle | bone | ctx
import re
M = {
 # forearm
 'fcu':['Humeral head of right flexor carpi ulnaris','Ulnar head of right flexor carpi ulnaris'],
 'fds':['Right flexor digitorum superficialis'],'pl':['Right palmaris longus'],'fcr':['Right flexor carpi radialis'],
 'pt':['Humeral head of right pronator teres','Ulnar head of right pronator teres'],'br':['Right brachioradialis'],
 'ecrl':['Right extensor carpi radialis longus'],'ecrb':['Right extensor carpi radialis brevis'],'ed':['Right extensor digitorum'],
 'edm':['Right extensor digiti minimi'],'ecu':['Right extensor carpi ulnaris'],'anc':['Right anconeus'],
 'apl':['Right abductor pollicis longus'],'epb':['Right extensor pollicis brevis'],'epl':['Right extensor pollicis longus'],
 'ei':['Right extensor indicis'],'fdp':['Right flexor digitorum profundus'],'fpl':['Right flexor pollicis longus'],
 'sup':['Right supinator'],'pq':['Right pronator quadratus'],
 # arm
 'bb_long':['Long head of right biceps brachii'],'bb_short':['Short head of right biceps brachii'],'brachialis':['Right brachialis'],
 'tb_long':['Long head of right triceps brachii'],'tb_lat':['Lateral head of right triceps brachii'],'tb_med':['Medial head of right triceps brachii'],
 'coraco':['Right coracobrachialis'],
 'delt_clav':['Clavicular part of right deltoid'],'delt_acro':['Acromial part of right deltoid'],'delt_spin':['Spinal part of right deltoid'],
 # hand
 'apb':['Right abductor pollicis brevis'],'fpb':['Superficial head of right flexor pollicis brevis'],'op':['Right opponens pollicis'],
 'adp':['Oblique head of right adductor pollicis','Transverse head of right adductor pollicis'],
 'adm':['Abductor digiti minimi of right hand'],'fdmb':['Flexor digiti minimi brevis of right hand'],'odm':['Opponens digiti minimi of right hand'],
 'dio':['Set of dorsal interossei of right hand'],'pio':['Set of palmar interossei of right hand'],'lumb':['Set of lumbricals of right hand'],
 # shoulder girdle / trunk
 'pm_clav':['Clavicular part of right pectoralis major'],'pm_stern':['Sternocostal part of right pectoralis major'],'pm_abd':['Abdominal part of right pectoralis major'],
 'trap_desc':['Descending part of right trapezius'],'trap_trans':['Transverse part of right trapezius'],'trap_asc':['Ascending part of right trapezius'],
 'infra':['Right infraspinatus muscle'],'supra':['Right supraspinatus'],'teres_maj':['Right teres major'],'teres_min':['Right teres minor'],
 'rhomb_maj':['Right rhomboid major'],'rhomb_min':['Right rhomboid minor'],'serr':['Right serratus anterior'],
 'lev':['Right levator scapulae'],'scm':['Right sternocleidomastoid'],
}
B = {
 'humerus':['Right humerus'],'radius':['Right radius'],'ulna':['Right ulna'],'scapula':['Right scapula'],'clavicle':['Right clavicle'],
 'carpus':['Right capitate','Right hamate','Right lunate','Right pisiform','Right scaphoid','Right trapezium','Right trapezoid','Right triquetral'],
 'metacarpus':['Right first metacarpal bone','Right second metacarpal bone','Right third metacarpal bone','Right fourth metacarpal bone','Right fifth metacarpal bone'],
 'phalanges':[],'sternum':['Manubrium','Body of sternum','Xiphoid process'],'ribs':[],'vertebrae':[],
 'retinaculum':['Flexor retinaculum of right wrist'],'membrane':['Interosseous membrane of right forearm'],
}
def classify(name):
    for k,lst in M.items():
        if name in lst: return k,'muscle'
    for k,lst in B.items():
        if name in lst: return k,'bone'
    if re.search(r'phalanx',name,re.I): return 'phalanges','bone'
    if re.search(r'rib$|costal cartilage',name,re.I): return 'ribs','bone'
    if re.search(r'vertebra',name,re.I): return 'vertebrae','bone'
    return 'ctx','ctx'
