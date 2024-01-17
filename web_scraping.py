from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from lxml import html
from lxml import etree
import re
from enum import Enum
from rekkasync.rekkasync import Manager
import json
from json import JSONDecodeError
import pandas as pd


class Move:
    def __init__(self,**kwargs):
        #dict = self.__rename(kwargs)
        #keys = list(kwargs.keys())
        #for key in keys:
        #    val = kwargs[key]
        #    del kwargs[key]
        #    kwargs[key.lower()] = val
            
        self.__dict__.update(kwargs)

    def __rename(self,dict):
        new_dict = {}
        for x in dict:
            value = dict[x]
            try:
                value = int(value)
            except ValueError:
                pass
            except TypeError:
                pass
            if x == 'src':
                vals = [Notation[v.split('/')[-1].split('.')[0].replace('-','_')].value[1] for v in value if v != '']
                new_dict['notation'] = vals
            else:
                try:
                    name = Names[x.split(' ')[0]].value
                    new_dict[name] = value
                except KeyError:
                    name = x
                    new_dict[name] = value

        return new_dict

    def __repr__(self):
        items = (f"{k}={v!r}\n" for k, v in self.__dict__.items())
        return "{}".format(''.join(items))

    def __eq__(self, other):
        if isinstance(self, SimpleNamespace) and isinstance(other, SimpleNamespace):
           return self.__dict__ == other.__dict__
        return NotImplemented

    def __getitem__(self,item):
        return getattr(self,item)

    def to_dict(self):
        return self.__dict__

class Names(Enum):
    frame_fixed_m__F0yxc = 'name'
    frame_startup_frame__IeKL6 = 'startup'
    frame_active_frame__1pLtR = 'active'
    frame_recovery_frame__WLqFt = 'recovery'
    frame_hit_frame__7cQT6 = 'on-hit'
    frame_block_frame___DOYN = 'on-block'
    frame_cancel__0oYdZ = 'cancel properties'
    frame_damage__D0g1H = 'damage'
    frame_combo_correct__7WrWM = 'scaling'
    frame_drive_gauge_gain_hit__C2Gty = 'drive gauge gain'
    frame_drive_gauge_lose_dguard__lc_Xg = 'blocked gauge drain'
    frame_drive_gauge_lose_punish__HTOzt = 'punish counter gauge drain'
    frame_sa_gauge_gain__e0GRR= 'super meter gain'
    frame_attribute__javf9 = 'properties'
    frame_note__6XAiP = 'note'
    frame_classic__OHge5 = 'notation'

class Notation(Enum):
    icon_punch = ['Punch','p']
    icon_kick = ['Kick','k']
    icon_punch_l = ['Light Punch','lp']
    icon_punch_m = ['Medium Punch','mp']
    icon_punch_h = ['Heavy Punch','hp']
    icon_kick_l = ['Light Kick','lk']
    icon_kick_m = ['Medium Kick','mk']
    icon_kick_h = ['Heavy Kick','hk']
    key_d = ['Down','2']
    key_dc = ['Down Charge','[2]']
    key_dl = ['Down Back','1']
    key_dlc = ['Down Back Charge','[1]']
    key_l = ['Back','4']
    key_lc = ['Back Charge','[4]']
    key_ul = ['Up Back','7']
    key_ulc = ['Up Back Charge','[7]']
    key_u = ['Up','8']
    key_uc = ['Up Charge','[8]']
    key_ur = ['Up Forward','9']
    key_urc = ['Up Forward Charge','[9]']
    key_r = ['Forward','6']
    key_rc = ['Forward Charge','[6]']
    key_dr = ['Down Forward','3']
    key_drc = ['Down Forward Charge','[3]']
    key_plus = ['+','+']   
    key_or = ['Or','|']
    arrow_3 = ['Then','~']
    key_nutral = ['Neutral','n']

def pull_moves(tree,section_heading):
    tables = []
    new_tree = tree.xpath('./section/article')
    #print(section_heading)
    for x in new_tree:    
        headers = x.xpath('./table/thead//tr//th/text()')
        body =  x.xpath('./table/tbody/tr')
        moves = []
        index = 1
        for row in body:
            cols = row.xpath('./td')
            tx = {}
            for y in range(len(cols)):
                t = cols[y].text_content()
                if t == '': t='-'
                try:
                    tx[headers[y].replace(' ','_')] = t
                except IndexError:
                    print(headers)
                    print(cols.text_content())
                    raise IndexError
            if section_heading=='Normals and Target Combos':
                if index <= 18:
                    tx['move_type'] = 'Normal'
                else:
                    test = tx['input']
                    if test[0:2] == 'j.': 
                        test=test[2:]
                    if len(test) <=3:
                        tx['move_type'] = 'Command Normal'
                    else:
                        tx['move_type'] = 'Target Combo'
            else:
                tx['move_type'] = section_heading
            moves.append(tx)
            index +=1
        tables.append(moves)
    return tables

def make_moves(source):
    tree = html.fromstring(source[0])
    name_tree = html.fromstring(source[1])
    names_df = get_names(name_tree)
    section = tree.xpath("//section[./h3]")[0]
    elements = section.xpath("./node()[@class='section-subheading'] | ./node()[@class='tabber']")
    heading = ''
    tmoves = []
    for element in elements:
        if element.attrib['class'] == 'section-subheading':
            heading = element.text_content()
        elif element.attrib['class'] == 'tabber':
            tmoves.append(pull_moves(element,heading))
    
    final_df = []
    for move_type in tmoves:
        tables = []
        for table in move_type:
            tdf = pd.DataFrame.from_dict(table)
            tdf.index.name = 'index'
            tables.append(tdf)
        tables[1] = tables[1].drop(columns=['input','move_type'])
        final = tables[0].merge(tables[1],on='index')
        final.index.name = 'index'
        tables = tables[2:]
        for x in tables:
            x = x.drop(columns=['input','move_type'])
            final = final.merge(x,on='index')
        final_df.append(final)
    df = pd.concat(final_df)
    df['fighter_id'] = source[2]
    
    #print(df)
    df = df.merge(names_df,on='input')
    return df

def get_source(fighters):
    driver = webdriver.Firefox()# Open the website
    sources = []
    for fighter in fighters:
        source = []
        driver.get(f"https://wiki.supercombo.gg/w/Street_Fighter_6/{fighter['fighter_name']}/Frame_data")
        source.append(driver.page_source)
        driver.get(f"https://wiki.supercombo.gg/w/Street_Fighter_6/{fighter['fighter_name']}")
        source.append(driver.page_source)
        source.append(fighter['fighter_id'])
        sources.append(source)
    driver.close()
    return sources

def get_names(name_tree):
    moves = name_tree.xpath(".//div[@class='movedata-flex-framedata-name']")
    names = []
    for move in moves:
        name = {}
        split = move.xpath("./div/div")
        name['input'] = split[0].text_content()
        name['move_name'] = split[1].text_content()
        names.append(name)
    names_df = pd.DataFrame.from_dict(names)
    return names_df

def set_recovery_to_block(s):
    data = []
    data.append(s['on_hit'])
    data.append(s['on_block'])
    prop = ''
    re2 = '(KD|HKD|Wall Splat)'
    for x in range(len(data)):
        try:
            matches = re.findall(re2,data[x])
        except Exception:
            matches = []
        if len(matches) > 0:
            if prop == '':
                prop = matches
            else: prop += matches
            data[x] = data[x].replace('HKD','').replace('KD','').replace('Wall Splat', '')
    s['on_hit'] = data[0]
    s['on_block'] = data[1]
    s['property'] = prop
    return s

def no_commas(s):
    for index, val in s.items():
        try:
            s[index] = val.replace(',',';')
        except Exception:
            pass
    return s

fighters = [
    'Luke',
    'Jamie',
    'Manon',
    'Kimberly',
    'Marisa',
    'Lily',
    'JP',
    'Juri',
    'Dee_Jay',
    'Cammy',
    'Ryu',
    'E.Honda',
    'Blanka',
    'Guile',
    'Ken',
    'Chun-Li',
    'Zangief',
    'Dhalsim',
    'Rashid',
    'A.K.I.'
]
for fighter_id in range(len(fighters)):
    fighters[fighter_id] = {'fighter_id':fighter_id+1,'fighter_name':fighters[fighter_id]}

sources = get_source(fighters)

moves = []
for x in sources:
    moves.append(make_moves(x))

moves = pd.concat(moves)
moves = moves.reset_index()
moves = moves[['fighter_id','move_name','input','move_type','Damage','Startup','Active','Recovery','Total',
               'Hit_Adv','Block_Adv','Guard','Cancel','Hitconfirm','Dmg_Scaling','Punish_Adv',
               'PerfParry_Adv','DR_Cancel_onHit','DR_Cancel_onBlock','Hitstun','Blockstun','Hitstop',
               'DriveDmg_Block','DriveDmg_Hit[PC]','Drive_Gain','SuperGain_Hit','SuperGain_Block',
               'Invuln','Armor','Airborne','Juggle_Start','Juggle_Increase','Juggle_Limit','Notes','Chip']]

moves = moves.rename(columns={'Startup':'startup','Active':'active','Recovery':'recovery',
                   'Total':'total','Hit_Adv':'on_hit','Block_Adv':'on_block','Damage':'damage'})

moves.columns = map(str.lower, moves.columns)
moves = moves.reset_index()

moves = moves.apply(set_recovery_to_block,axis=1)
moves = moves.apply(no_commas,axis=1)
moves = moves[['fighter_id', 'move_name', 'input', 'move_type', 'damage', 'startup',
       'active', 'recovery', 'total', 'on_hit',
        'on_block', 'guard', 'cancel',
       'hitconfirm', 'dmg_scaling', 'punish_adv', 'perfparry_adv',
       'dr_cancel_onhit', 'dr_cancel_onblock', 'hitstun', 'blockstun',
       'hitstop', 'drivedmg_block', 'drivedmg_hit[pc]', 'drive_gain',
       'supergain_hit', 'supergain_block', 'invuln', 'armor', 'airborne',
       'juggle_start', 'juggle_increase', 'juggle_limit', 'notes', 'chip',
       'property']]
moves.to_csv('data/final_moves.csv',index=True)
moves_base = moves[['fighter_id','move_name','input','move_type','damage','startup',
                        'active','recovery','total','on_hit',
                        'on_block','guard','cancel',
                        'dmg_scaling','invuln','armor','airborne','notes']]
moves_base.to_csv('data/moves_base.csv',index=True)

