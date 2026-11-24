/* CaseLab game rules: cases, Steam prices, drop chances, items, battle pass.
   Shared by the server (Node) and the website, so both always use the same rules. */
/* ---------- tiers ---------- */
/* chance: demo odds. real: odds of real CS2 cases. lo/hi: item price as multiple of case price */
const RAR={
  con:{k:'con',name:'Ширпотреб',color:'#b0c3d9',hue:212,chance:0,real:0,lo:.1,hi:.3,ord:-2},  /* market only: no case drops these two */
  ind:{k:'ind',name:'Промышленное качество',color:'#5e98d9',hue:212,chance:0,real:0,lo:.2,hi:.5,ord:-1},
  mil:{k:'mil',name:'Армейское качество',color:'#4b69ff',hue:228,chance:58,real:79.92,lo:.5,hi:.8,ord:0},
  res:{k:'res',name:'Запрещённое',color:'#8847ff',hue:266,chance:28,real:15.98,lo:.8,hi:1.3,ord:1},
  cls:{k:'cls',name:'Засекреченное',color:'#d32ce6',hue:296,chance:10,real:3.2,lo:1.3,hi:3,ord:2},
  cov:{k:'cov',name:'Тайное',color:'#eb4b4b',hue:2,chance:3.5,real:.64,lo:3,hi:8,ord:3},
  gld:{k:'gld',name:'Редкий предмет',color:'#e4ae39',hue:42,chance:.5,real:.26,lo:8,hi:25,ord:4}
};
const TIERS=['mil','res','cls','cov','gld'];
const RLIST=TIERS.slice().reverse();
const WEARS=[
  {max:.07,s:'FN',n:'Прямо с завода',m:1.15},
  {max:.15,s:'MW',n:'Немного поношенное',m:1.07},
  {max:.38,s:'FT',n:'После полевых',m:1},
  {max:.45,s:'WW',n:'Поношенное',m:.94},
  {max:1.01,s:'BS',n:'Закалённое в боях',m:.88}
];
const CATS=[['all','Все'],['colors','Цвета'],['gloves','Перчатки'],['agents','Агенты'],['guns','Оружие'],['knives','Ножи'],['top','Топ'],['meme','Мемы'],['style','Стиль'],['real','Кейсы CS2']];

/* w: r rifle, p pistol, s sniper, m smg, k knife, g gloves, a agent */
const D=[
 {id:'red',name:'Красный кейс',price:10,hue:2,cat:'colors',icon:'flame',t:[
  ['p~P2000 | Fire Elemental','m~MP7 | Bloodsport','s~SSG 08 | Blood in the Water','p~Desert Eagle | Code Red'],
  ['r~AK-47 | Redline','r~M4A1-S | Chantico\'s Fire','s~AWP | Wildfire'],
  ['r~AK-47 | Bloodsport','p~Desert Eagle | Blaze','s~AWP | Oni Taiji'],
  ['r~AK-47 | Fire Serpent','r~M4A4 | Howl'],
  ['k~★ Karambit | Crimson Web','k~★ Butterfly Knife | Crimson Web']]},
 {id:'blue',name:'Синий кейс',price:15,hue:222,cat:'colors',icon:'drop',t:[
  ['p~Glock-18 | Water Elemental','p~USP-S | Cortex','m~MP9 | Hypnotic','s~SCAR-20 | Cyrex'],
  ['r~AK-47 | Vulcan','r~M4A4 | Desolate Space','s~AWP | Lightning Strike'],
  ['r~AK-47 | Frontside Misty','r~M4A1-S | Cyrex','p~USP-S | Kill Confirmed'],
  ['s~AWP | Electric Hive','r~AK-47 | Case Hardened'],
  ['k~★ Karambit | Doppler','k~★ M9 Bayonet | Case Hardened']]},
 {id:'agents1',name:'Кейс агентов',price:15,hue:205,cat:'agents',icon:'person',t:[
  ['a~Bio-Haz Specialist | SWAT','a~Operator | FBI SWAT','a~Soldier | Phoenix','a~\'Blueberries\' Buckshot | NSWC SEAL'],
  ['a~Dragomir | Sabre','a~Cmdr. Davida \'Goggles\' Fernandez | SEAL Frogman','a~Lt. Commander Ricksaw | NSWC SEAL'],
  ['a~Cmdr. Mae \'Dead Cold\' Jamison | SWAT','a~\'The Doctor\' Romanov | Sabre','a~Getaway Sally | The Professionals'],
  ['a~Number K | The Professionals','a~Col. Mangos Dabisi | Guerrilla Warfare'],
  ['a~Special Agent Ava | FBI','a~Sir Bloody Miami Darryl | The Professionals']]},
 {id:'green',name:'Зелёный кейс',price:25,hue:140,cat:'colors',icon:'leaf',t:[
  ['m~MAC-10 | Neon Rider','p~Tec-9 | Fuel Injector','r~Galil AR | Chatterbox','s~SSG 08 | Dragonfire'],
  ['r~M4A1-S | Hyper Beast','r~AK-47 | Neon Revolution','p~USP-S | Caiman'],
  ['s~AWP | Hyper Beast','r~AK-47 | Fuel Injector','p~Glock-18 | Gamma Doppler'],
  ['s~AWP | Medusa','r~M4A1-S | Printstream'],
  ['k~★ Karambit | Gamma Doppler','k~★ Bayonet | Gamma Doppler']]},
 {id:'gloves1',name:'Перчаточный кейс',price:30,hue:28,cat:'gloves',icon:'glove',t:[
  ['g~★ Hand Wraps | Overprint','g~★ Sport Gloves | Hedge Maze','g~★ Driver Gloves | Lunar Weave','g~★ Specialist Gloves | Forest DDPAT'],
  ['g~★ Moto Gloves | Boom!','g~★ Bloodhound Gloves | Charred','g~★ Hydra Gloves | Emerald'],
  ['g~★ Specialist Gloves | Crimson Kimono','g~★ Driver Gloves | King Snake','g~★ Sport Gloves | Vice'],
  ['g~★ Sport Gloves | Pandora\'s Box','g~★ Hand Wraps | Cobalt Skulls'],
  ['g~★ Specialist Gloves | Emerald Web','g~★ Moto Gloves | Spearmint']]},
 {id:'purple',name:'Фиолетовый кейс',price:40,hue:274,cat:'colors',icon:'gem',t:[
  ['m~UMP-45 | Primal Saber','p~Glock-18 | Neo-Noir','m~P90 | Death by Kitty','r~FAMAS | Roll Cage'],
  ['r~M4A4 | Neo-Noir','s~AWP | Neo-Noir','p~USP-S | Neo-Noir'],
  ['r~AK-47 | Neon Revolution','p~Desert Eagle | Kumicho Dragon','r~M4A4 | The Emperor'],
  ['s~AWP | Fade','r~AK-47 | Wild Lotus'],
  ['k~★ Butterfly Knife | Doppler','k~★ Karambit | Lore']]},
 {id:'ak',name:'Кейс AK-47',price:50,hue:24,cat:'guns',icon:'cross',t:[
  ['r~AK-47 | Elite Build','r~AK-47 | Slate','r~AK-47 | Safety Net','r~AK-47 | Point Disarray'],
  ['r~AK-47 | Phantom Disruptor','r~AK-47 | Jaguar','r~AK-47 | Aquamarine Revenge'],
  ['r~AK-47 | Fuel Injector','r~AK-47 | Neon Revolution','r~AK-47 | The Empress'],
  ['r~AK-47 | Asiimov','r~AK-47 | Hydroponic'],
  ['r~AK-47 | Gold Arabesque','r~AK-47 | Fire Serpent']]},
 {id:'pink',name:'Розовый кейс',price:60,hue:322,cat:'colors',icon:'star',t:[
  ['m~MAC-10 | Neon Rider','p~P250 | Muertos','m~PP-Bizon | Judgement of Anubis','p~Five-SeveN | Hyper Beast'],
  ['r~M4A1-S | Cyrex','s~AWP | Hyper Beast','r~AK-47 | Asiimov'],
  ['p~Desert Eagle | Kumicho Dragon','r~M4A4 | Neo-Noir','p~Glock-18 | Fade'],
  ['s~AWP | Containment Breach','r~AK-47 | Neon Revolution'],
  ['k~★ Butterfly Knife | Fade','k~★ Karambit | Tiger Tooth']]},
 {id:'agents2',name:'Спецагенты',price:80,hue:182,cat:'agents',icon:'person',t:[
  ['a~Slingshot | Phoenix','a~Maximus | Sabre','a~Trapper | Guerrilla Warfare','a~Ground Rebel | Elite Crew'],
  ['a~Osiris | Elite Crew','a~Prof. Shahmat | Elite Crew','a~Rezan The Ready | Sabre'],
  ['a~Safecracker Voltzmann | The Professionals','a~Michael Syfers | FBI Sniper','a~3rd Commando Company | KSK'],
  ['a~Bloody Darryl The Strapped | The Professionals','a~Aspirant | Gendarmerie Nationale'],
  ['a~Sir Bloody Darryl Royale | The Professionals','a~Special Agent Ava | FBI']]},
 {id:'awp',name:'Кейс AWP',price:100,hue:198,cat:'guns',icon:'cross',t:[
  ['s~AWP | Pit Viper','s~AWP | Atheris','s~AWP | Elite Build','s~AWP | Mortis'],
  ['s~AWP | Asiimov','s~AWP | Hyper Beast','s~AWP | Neo-Noir'],
  ['s~AWP | Redline','s~AWP | Containment Breach','s~AWP | Oni Taiji'],
  ['s~AWP | Gungnir','s~AWP | Fade'],
  ['s~AWP | Medusa','s~AWP | Dragon Lore']]},
 {id:'gloves2',name:'Перчатки Elite',price:120,hue:48,cat:'gloves',icon:'glove',t:[
  ['g~★ Hydra Gloves | Case Hardened','g~★ Driver Gloves | Imperial Plaid','g~★ Moto Gloves | Turtle','g~★ Bloodhound Gloves | Snakebite'],
  ['g~★ Specialist Gloves | Mogul','g~★ Sport Gloves | Amphibious','g~★ Hand Wraps | Giraffe'],
  ['g~★ Moto Gloves | Cool Mint','g~★ Driver Gloves | Crimson Weave','g~★ Sport Gloves | Nocts'],
  ['g~★ Specialist Gloves | Marble Fade','g~★ Broken Fang Gloves | Jade'],
  ['g~★ Sport Gloves | Pandora\'s Box','g~★ Specialist Gloves | Emerald Web']]},
 {id:'knife',name:'Ножевой кейс',price:200,hue:352,cat:'knives',icon:'knife',t:[
  ['k~★ Bayonet | Forest DDPAT','k~★ Flip Knife | Urban Masked','k~★ Gut Knife | Rust Coat','k~★ Falchion Knife | Safari Mesh'],
  ['k~★ Huntsman Knife | Slaughter','k~★ Bowie Knife | Night','k~★ Shadow Daggers | Fade'],
  ['k~★ Flip Knife | Doppler','k~★ Gut Knife | Marble Fade','k~★ M9 Bayonet | Tiger Tooth'],
  ['k~★ Karambit | Fade','k~★ Butterfly Knife | Marble Fade'],
  ['k~★ Karambit | Gamma Doppler','k~★ Butterfly Knife | Crimson Web']]},
 {id:'gold',name:'Золотой кейс',price:250,hue:44,cat:'colors',icon:'crown',t:[
  ['r~AK-47 | Gold Arabesque','r~M4A1-S | Golden Coil','p~Desert Eagle | Blaze','m~UMP-45 | Gold Bismuth'],
  ['k~★ Flip Knife | Lore','k~★ Huntsman Knife | Fade','g~★ Sport Gloves | Hedge Maze'],
  ['k~★ Bayonet | Doppler','g~★ Driver Gloves | King Snake','k~★ Bowie Knife | Case Hardened'],
  ['k~★ Karambit | Fade','g~★ Sport Gloves | Pandora\'s Box'],
  ['k~★ Butterfly Knife | Gamma Doppler','k~★ Karambit | Case Hardened']]},
 {id:'karambit',name:'Керамбит кейс',price:500,hue:300,cat:'knives',icon:'knife',t:[
  ['k~★ Karambit | Forest DDPAT','k~★ Karambit | Night','k~★ Karambit | Scorched','k~★ Karambit | Safari Mesh'],
  ['k~★ Karambit | Blue Steel','k~★ Karambit | Stained','k~★ Karambit | Slaughter'],
  ['k~★ Karambit | Tiger Tooth','k~★ Karambit | Marble Fade','k~★ Karambit | Doppler'],
  ['k~★ Karambit | Fade','k~★ Karambit | Case Hardened'],
  ['k~★ Karambit | Crimson Web','k~★ Karambit | Lore']]},
 {id:'legend',name:'Легенда',price:1000,hue:38,cat:'top',icon:'crown',t:[
  ['g~★ Sport Gloves | Pandora\'s Box','g~★ Specialist Gloves | Fade','k~★ Flip Knife | Doppler','g~★ Hand Wraps | Cobalt Skulls'],
  ['k~★ Karambit | Gamma Doppler','k~★ M9 Bayonet | Crimson Web','k~★ Butterfly Knife | Fade'],
  ['s~AWP | Gungnir','r~M4A4 | Howl','r~AK-47 | Wild Lotus'],
  ['s~AWP | Dragon Lore','k~★ Karambit | Doppler'],
  ['k~★ Karambit | Case Hardened','k~★ Butterfly Knife | Crimson Web']]},
 {id:'kilowatt',name:'Kilowatt Case',price:3,hue:190,cat:'real',icon:'bolt',img:'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_frnEVvqf_a6VoIfGSXz7Hlbwg57QwSS_mxhl15jiGyN37c3_GZw91W8BwRflK7EfKsa2sfw',t:[
  ['p~Dual Berettas | Hideout','m~MAC-10 | Light Box','s~SSG 08 | Dezastre','m~UMP-45 | Motorized'],
  ['p~Glock-18 | Block-18','r~M4A4 | Etch Lord','p~Five-SeveN | Hybrid'],
  ['r~M4A1-S | Black Lotus','p~Zeus x27 | Olympus','p~USP-S | Jawbreaker'],
  ['s~AWP | Chrome Cannon','r~AK-47 | Inheritance'],
  ['k~★ Kukri Knife | Fade','k~★ Kukri Knife | Crimson Web']]},
 {id:'revolution',name:'Revolution Case',price:3,hue:330,cat:'real',icon:'star',img:'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_frnAVvfb6aqduc_TFVjTCxbx05OU4S3jilE9w4DzRnImtIy2Sa1JzDJEhRPlK7EcO4U8gfA',t:[
  ['m~MAG-7 | Insomnia','m~MP9 | Featherweight','r~SG 553 | Cyberforce','p~Tec-9 | Rebel'],
  ['r~M4A1-S | Emphorosaur-S','p~Glock-18 | Umbral Rabbit','m~P90 | Neoqueen'],
  ['s~AWP | Duality','m~UMP-45 | Wild Child','p~P2000 | Wicked Sick'],
  ['r~M4A4 | Temukau','r~AK-47 | Head Shot'],
  ['g~★ Specialist Gloves | Crimson Web','g~★ Moto Gloves | POW!']]},
 {id:'dreams',name:'Dreams & Nightmares Case',price:3,hue:258,cat:'real',icon:'gem',img:'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_frnIV7Kb5OaU-JqfHDzXFle0u4LY8Gy_kkRgisGzcm4v4J3vDOAQmDMdyRvlK7EcmeCU3yw',t:[
  ['p~Five-SeveN | Scrawl','m~MAC-10 | Ensnared','m~MP5-SD | Necro Jr.','p~P2000 | Lifted Spirits'],
  ['m~PP-Bizon | Space Cat','r~M4A1-S | Night Terror','p~USP-S | Ticket to Hell'],
  ['p~Dual Berettas | Melondrama','r~FAMAS | Rapid Eye Movement','m~MP7 | Abyssal Apparition'],
  ['r~AK-47 | Nightwish','m~MP9 | Starlight Protector'],
  ['k~★ Butterfly Knife | Lore','k~★ Bowie Knife | Gamma Doppler']]},
 {id:'fracture',name:'Fracture Case',price:3,hue:14,cat:'real',icon:'cross',img:'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_fr3QV7aD7OP01IfbGDzPCmbsm4LU5GnvkzUsi4WvUmIqtci_CPQNyApsjE_lK7EfrhW545A',t:[
  ['p~P2000 | Gnarled','s~SSG 08 | Mainframe 001','p~P250 | Cassette','m~P90 | Freight'],
  ['m~MAG-7 | Monster Call','m~MAC-10 | Allure','r~Galil AR | Connexion'],
  ['r~M4A4 | Tooth Fairy','p~Glock-18 | Vogue','m~XM1014 | Entombed'],
  ['p~Desert Eagle | Printstream','r~AK-47 | Legion of Anubis'],
  ['k~★ Skeleton Knife | Fade','k~★ Paracord Knife | Fade']]},
 {id:'fever',name:"Fever Case",price:3,hue:350,cat:'real',icon:'star',img:"https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_frncVtqv7MPE8JaHHCj_Dl-wk4-NtFirikURy4jiGwo2udHqVaAEjDZp3EflK7EeSMnMs4w",t:[
  ["r~M4A4 | Choppa","m~MAG-7 | Resupply","s~SSG 08 | Memorial","p~P2000 | Sure Grip","p~USP-S | PC-GRN","m~MP9 | Nexus","m~XM1014 | Mockingbird"],
  ["p~Desert Eagle | Serpent Strike","r~Zeus x27 | Tosai","m~Nova | Rising Sun","r~Galil AR | Control","m~P90 | Wave Breaker"],
  ["r~AK-47 | Searing Rage","p~Glock-18 | Shinobu","m~UMP-45 | K.O. Factory"],
  ["r~FAMAS | Bad Trip","s~AWP | Printstream"],
  ["k~★ Nomad Knife | Doppler","k~★ Skeleton Knife | Doppler","k~★ Paracord Knife | Doppler","k~★ Survival Knife | Doppler"]]},
 {id:'gallery',name:"Gallery Case",price:3,hue:275,cat:'real',icon:'star',img:"https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_frnYVuPD5baE6IfTFCmSRme0j5eU5SXrjkRwmt2rWnoqhdnjEPQQiDpRxTflK7EePRV2-Kg",t:[
  ["p~USP-S | 27","p~Desert Eagle | Calligraffiti","m~MP5-SD | Statics","r~AUG | Luxe Trim","m~M249 | Hypnosis","p~R8 Revolver | Tango","s~SCAR-20 | Trail Blazer"],
  ["r~M4A4 | Turbine","p~Dual Berettas | Hydro Strike","m~MAC-10 | Saibā Oni","m~P90 | Randy Rush","s~SSG 08 | Rapid Transit"],
  ["r~AK-47 | The Outsiders","p~P250 | Epicenter","m~UMP-45 | Neo-Noir"],
  ["p~Glock-18 | Gold Toof","r~M4A1-S | Vaporwave"],
  ["k~★ Kukri Knife | Fade"]]},
 {id:'recoil',name:"Recoil Case",price:3,hue:30,cat:'real',icon:'star',img:"https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_frnMVu6b-avA-JqSSCjSWwuhz47U9TCzlxh9yt2WGnNqgIi-fbgUkWMNxFPlK7EdIJF6a2Q",t:[
  ["r~FAMAS | Meow 36","r~Galil AR | Destroyer","r~M4A4 | Poly Mag","m~MAC-10 | Monkeyflage","m~Negev | Drop Me","m~UMP-45 | Roadblock","p~Glock-18 | Winterized"],
  ["p~R8 Revolver | Crazy 8","m~M249 | Downtown","r~SG 553 | Dragon Tech","m~P90 | Vent Rush","p~Dual Berettas | Flora Carnivora"],
  ["r~AK-47 | Ice Coaled","p~P250 | Visions","m~Sawed-Off | Kiss♥Love"],
  ["p~USP-S | Printstream","s~AWP | Chromatic Aberration"],
  ["g~★ Specialist Gloves | Marble Fade","g~★ Moto Gloves | 3rd Commando Company","g~★ Sport Gloves | Scarlet Shamagh","g~★ Driver Gloves | Rezan the Red"]]},
 {id:'snakebite',name:"Snakebite Case",price:3,hue:95,cat:'real',icon:'star',img:"https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_fr3oVvvT4bfI4dvTLCGTCmLl16ec7TX_mk08k42iHwtqscy-WPVUmCZJ4R_lK7Ed8Q6OYtw",t:[
  ["r~SG 553 | Heavy Metal","p~Glock-18 | Clear Polymer","m~M249 | O.S.I.P.R.","p~CZ75-Auto | Circaetus","m~UMP-45 | Oscillator","p~R8 Revolver | Junk Yard","m~Nova | Windblown"],
  ["p~P250 | Cyber Shell","m~Negev | dev_texture","m~MAC-10 | Button Masher","p~Desert Eagle | Trigger Discipline","r~AK-47 | Slate"],
  ["m~MP9 | Food Chain","m~XM1014 | XOXO","r~Galil AR | Chromatic Aberration"],
  ["p~USP-S | The Traitor","r~M4A4 | In Living Color"],
  ["g~★ Specialist Gloves | Marble Fade","g~★ Moto Gloves | 3rd Commando Company","g~★ Sport Gloves | Scarlet Shamagh","g~★ Driver Gloves | Rezan the Red"]]},
 {id:'riptide',name:"Operation Riptide Case",price:3,hue:200,cat:'real',icon:'star',img:"https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_fr3sVtvD2O_Q9dqfEXTWSlepz4bA5THnikx915z6BytmuIHiXaAdyDpEhTflK7EdW-TaRMg",t:[
  ["r~AUG | Plague","p~Dual Berettas | Tread","s~G3SG1 | Keeping Tabs","m~MP7 | Guerrilla","m~PP-Bizon | Lumen","p~USP-S | Black Lotus","m~XM1014 | Watchdog"],
  ["m~MAG-7 | BI83 Spectrum","r~FAMAS | ZX Spectron","p~Five-SeveN | Boost Protocol","m~MP9 | Mount Fuji","r~M4A4 | Spider Lily"],
  ["m~MAC-10 | Toybox","p~Glock-18 | Snack Attack","s~SSG 08 | Turbo Peek"],
  ["r~AK-47 | Leet Museo","p~Desert Eagle | Ocean Drive"],
  ["k~★ Shadow Daggers | Gamma Doppler","k~★ Falchion Knife | Gamma Doppler","k~★ Huntsman Knife | Gamma Doppler","k~★ Bowie Knife | Gamma Doppler"]]},
 {id:'brokenfang',name:"Operation Broken Fang Case",price:3,hue:15,cat:'real',icon:'star',img:"https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_fr3UVu6P-MPQ0dKbCVzLGx7wgtbM6S3jhw0V25m-EnNj7JS7GaQ4nD8QiRflK7EfH0YGFHg",t:[
  ["p~CZ75-Auto | Vendetta","m~P90 | Cocoa Rampage","s~G3SG1 | Digital Mesh","r~Galil AR | Vandal","p~P250 | Contaminant","m~M249 | Deep Relief","m~MP5-SD | Condition Zero"],
  ["s~AWP | Exoskeleton","p~Dual Berettas | Dezastre","m~Nova | Clear Polymer","s~SSG 08 | Parallax","m~UMP-45 | Gold Bismuth"],
  ["p~Five-SeveN | Fairy Tale","r~M4A4 | Cyber Security","p~USP-S | Monster Mashup"],
  ["r~M4A1-S | Printstream","p~Glock-18 | Neo-Noir"],
  ["g~★ Specialist Gloves | Marble Fade","g~★ Moto Gloves | 3rd Commando Company","g~★ Sport Gloves | Scarlet Shamagh","g~★ Driver Gloves | Rezan the Red"]]},
 {id:'prisma2',name:"Prisma 2 Case",price:3,hue:290,cat:'real',icon:'star',img:"https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_fr3cV6vT9avBvefWWDDGTxbZ14rhsTX7qkE90sDiHwt2pdC-TblJ2DsB1QPlK7Ee9riHKAA",t:[
  ["r~AUG | Tom Cat","s~AWP | Capillary","p~CZ75-Auto | Distressed","p~Desert Eagle | Blue Ply","m~MP5-SD | Desert Strike","m~Negev | Prototype","p~R8 Revolver | Bone Forged"],
  ["p~P2000 | Acid Etched","m~Sawed-Off | Apocalypto","s~SCAR-20 | Enforcer","r~SG 553 | Darkwing","s~SSG 08 | Fever Dream"],
  ["r~AK-47 | Phantom Disruptor","m~MAC-10 | Disco Tech","m~MAG-7 | Justice"],
  ["r~M4A1-S | Player Two","p~Glock-18 | Bullet Queen"],
  ["k~★ Ursus Knife | Doppler","k~★ Navaja Knife | Doppler","k~★ Talon Knife | Doppler","k~★ Stiletto Knife | Doppler"]]},
 {id:'cs20',name:"CS20 Case",price:3,hue:45,cat:'real',icon:'star',img:"https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_fr3YVvfD9aqVveKaQDDKSl7134bg_HH3hlBty6z7Vn9v6eXmeZgBxWJd0EflK7Efs4hZiKQ",t:[
  ["p~Dual Berettas | Elite 1.6","p~Tec-9 | Flash Out","m~MAC-10 | Classic Crate","m~MAG-7 | Popdog","s~SCAR-20 | Assault","r~FAMAS | Decommissioned","p~Glock-18 | Sacrifice"],
  ["m~M249 | Aztec","m~MP5-SD | Agent","p~Five-SeveN | Buddy","p~P250 | Inferno","m~UMP-45 | Plastique"],
  ["m~MP9 | Hydra","m~P90 | Nostalgia","r~AUG | Death by Puppy"],
  ["s~AWP | Wildfire","r~FAMAS | Commemoration"],
  ["k~★ Classic Knife | Fade"]]},
 {id:'clutchcase',name:"Clutch Case",price:3,hue:215,cat:'real',icon:'star',img:"https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_frHsVtqr8a_dsdKTAWDWVxLgjsrAwHSvgwEQk4m-ByYuqIC2eO1VyD5QiR_lK7EcxQQPYQA",t:[
  ["m~PP-Bizon | Night Riot","p~Five-SeveN | Flame Test","m~MP9 | Black Sand","p~P2000 | Urban Hazard","p~R8 Revolver | Grip","r~SG 553 | Aloha","m~XM1014 | Oxide Blaze"],
  ["p~Glock-18 | Moonrise","m~Negev | Lionfish","m~Nova | Wild Six","m~MAG-7 | SWAG-7","m~UMP-45 | Arctic Wolf"],
  ["r~AUG | Stymphalian","s~AWP | Mortis","p~USP-S | Cortex"],
  ["r~M4A4 | Neo-Noir","m~MP7 | Bloodsport"],
  ["g~★ Specialist Gloves | Fade","g~★ Sport Gloves | Vice","g~★ Hydra Gloves | Emerald","g~★ Moto Gloves | Polygon"]]},
 {id:'dangerzone',name:"Danger Zone Case",price:3,hue:25,cat:'real',icon:'star',img:"https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_fr3MVv_H4a6FucPPBWjDIkbdz4rg4Syyyxxsi5mzRntuvJCqVbwAgDZBwRPlK7EcZJ5GkQA",t:[
  ["m~MP9 | Modest Threat","p~Glock-18 | Oxide Blaze","m~Nova | Wood Fired","r~M4A4 | Magnesium","m~Sawed-Off | Black Sand","r~SG 553 | Danger Close","p~Tec-9 | Fubar"],
  ["s~G3SG1 | Scavenger","r~Galil AR | Signal","m~MAC-10 | Pipe Down","p~P250 | Nevermore","p~USP-S | Flashback"],
  ["m~UMP-45 | Momentum","p~Desert Eagle | Mecha Industries","m~MP5-SD | Phosphor"],
  ["r~AK-47 | Asiimov","s~AWP | Neo-Noir"],
  ["k~★ Talon Knife | Fade","k~★ Ursus Knife | Fade","k~★ Navaja Knife | Fade","k~★ Stiletto Knife | Fade"]]},
 {id:'horizon',name:"Horizon Case",price:3,hue:300,cat:'real',icon:'star',img:"https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_fr3IV6vSrbfw8eaiWCjWVkewgseM9TXyxl0wi6mSHn9-tIHqUbg5yDpEmEPlK7EcXFmSLsw",t:[
  ["r~AUG | Amber Slipstream","p~Dual Berettas | Shred","p~Glock-18 | Warhawk","m~MP9 | Capillary","m~P90 | Traction","p~R8 Revolver | Survivalist","p~Tec-9 | Snek-9"],
  ["p~CZ75-Auto | Eco","s~G3SG1 | High Seas","m~Nova | Toy Soldier","s~AWP | PAW","m~MP7 | Powercore"],
  ["r~M4A1-S | Nightmare","m~Sawed-Off | Devourer","r~FAMAS | Eye of Athena"],
  ["r~AK-47 | Neon Rider","p~Desert Eagle | Code Red"],
  ["k~★ Talon Knife | Fade","k~★ Ursus Knife | Fade","k~★ Navaja Knife | Fade","k~★ Stiletto Knife | Fade"]]},
 {id:'chroma2',name:"Chroma 2 Case",price:3,hue:200,cat:'real',icon:'star',img:"https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_fqmwOuKD2PqI6caDBWDeUkO8uteM9SnDglklw6miEn9j6IHKfblNxA5pxW6dU5UH4LtBe",t:[
  ["r~AK-47 | Elite Build","m~MP7 | Armor Core","p~Desert Eagle | Bronze Deco","p~P250 | Valence","m~Negev | Man-o'-war","m~Sawed-Off | Origami"],
  ["s~AWP | Worm God","m~MAG-7 | Heat","p~CZ75-Auto | Pole Position","m~UMP-45 | Grand Prix"],
  ["p~Five-SeveN | Monkey Business","r~Galil AR | Eco","r~FAMAS | Djinn"],
  ["r~M4A1-S | Hyper Beast","m~MAC-10 | Neon Rider"],
  ["k~★ Flip Knife | Doppler","k~★ M9 Bayonet | Doppler","k~★ Karambit | Doppler","k~★ Gut Knife | Doppler"]]},
 {id:'gamma2',name:"Gamma 2 Case",price:3,hue:140,cat:'real',icon:'star',img:"https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bjz61TqQCKj0JfipHMN7aX2bfM9eaPDXT7Glbx1s7Y8HHHnw0sltWXSmYmqcH-UaAU-Sswn_16VNj0",t:[
  ["p~CZ75-Auto | Imprint","p~Five-SeveN | Scumbria","s~G3SG1 | Ventilator","m~Negev | Dazzle","m~P90 | Grim","m~UMP-45 | Briefing","m~XM1014 | Slipstream"],
  ["p~Desert Eagle | Directive","p~Glock-18 | Weasel","m~MAG-7 | Petroglyph","s~SCAR-20 | Powercore","r~SG 553 | Triarch"],
  ["r~AUG | Syd Mead","m~MP9 | Airlock","p~Tec-9 | Fuel Injector"],
  ["r~AK-47 | Neon Revolution","r~FAMAS | Roll Cage"],
  ["k~★ Gut Knife | Gamma Doppler","k~★ M9 Bayonet | Gamma Doppler","k~★ Karambit | Gamma Doppler","k~★ Bayonet | Gamma Doppler"]]},
 {id:'spectrum2',name:"Spectrum 2 Case",price:3,hue:265,cat:'real',icon:'star',img:"https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bj35VTqVBP4io_frHoVu6D7PaA0JaDACjKUwOom47VrTSzrw0Vx4W_Sydz9JC7FZgckCZYjRPlK7EcPuDAQzw",t:[
  ["m~Sawed-Off | Morris","r~AUG | Triqua","s~G3SG1 | Hunter","p~Glock-18 | Off World","m~MAC-10 | Oceanic","p~Tec-9 | Cracked Opal","s~SCAR-20 | Jungle Slipstream"],
  ["m~MP9 | Goo","r~SG 553 | Phantom","p~CZ75-Auto | Tacticat","m~UMP-45 | Exposure","m~XM1014 | Ziggy"],
  ["m~PP-Bizon | High Roller","r~M4A1-S | Leaded Glass","p~R8 Revolver | Llama Cannon"],
  ["r~AK-47 | The Empress","p~P250 | See Ya Later"],
  ["k~★ Huntsman Knife | Doppler","k~★ Falchion Knife | Doppler","k~★ Butterfly Knife | Doppler","k~★ Shadow Daggers | Doppler"]]},
 {id:'weapon1',name:"CS:GO Weapon Case",price:3,hue:35,cat:'real',icon:'star',img:"https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XsnXwtmkJjSU91dh8bji61XxRCKg0MSz_nUDvPb-OPFvdKTFDzbAkbp16bY5Gn6wkx9ysj7Xntf9IC6WZgA-Sswnnj45WXo",t:[
  ["m~MP7 | Skulls","r~AUG | Wings","r~SG 553 | Ultraviolet"],
  ["p~Glock-18 | Dragon Tattoo","p~USP-S | Dark Water","r~M4A1-S | Dark Water"],
  ["r~AK-47 | Case Hardened","p~Desert Eagle | Hypnotic"],
  ["s~AWP | Lightning Strike"],
  ["k~★ Flip Knife | Fade","k~★ Gut Knife | Fade","k~★ M9 Bayonet | Fade","k~★ Karambit | Fade"]]},
 {id:'rushb',name:"Rush B, не стоп",price:5,hue:14,cat:'meme',icon:'star',t:[
  ["r~AK-47 | Uncharted","p~Glock-18 | Winterized","r~M4A1-S | Mud-Spec","m~MAG-7 | Bulldozer"],
  ["r~AK-47 | Rat Rod","r~AK-47 | Ice Coaled","p~Desert Eagle | Mecha Industries"],
  ["r~AK-47 | Redline","r~AK-47 | Blue Laminate","r~M4A4 | Buzz Kill"],
  ["r~AK-47 | Vulcan","r~AK-47 | Fire Serpent"],
  ["k~★ Bayonet | Lore","k~★ Karambit | Autotronic"]]},
 {id:'eco',name:"Эко-раунд",price:5,hue:48,cat:'meme',icon:'star',t:[
  ["p~Glock-18 | Moonrise","p~Desert Eagle | Light Rail","p~P250 | Asiimov","p~Glock-18 | Candy Apple"],
  ["p~Glock-18 | Snack Attack","p~Five-SeveN | Angry Mob","p~P250 | See Ya Later"],
  ["p~USP-S | Orion","p~Glock-18 | Bullet Queen","p~Desert Eagle | Golden Koi"],
  ["p~USP-S | Printstream","p~Glock-18 | Wasteland Rebel"],
  ["k~★ Gut Knife | Doppler","k~★ Navaja Knife | Doppler"]]},
 {id:'clutch',name:"1 HP клатч",price:5,hue:352,cat:'meme',icon:'star',t:[
  ["s~SSG 08 | Turbo Peek","s~AWP | Worm God","s~AWP | Exoskeleton","p~USP-S | Black Lotus"],
  ["s~AWP | Fever Dream","s~AWP | Silk Tiger","p~Desert Eagle | Night Heist"],
  ["s~AWP | Graphite","s~AWP | BOOM","p~USP-S | Kill Confirmed"],
  ["s~AWP | Desert Hydra","s~AWP | The Prince"],
  ["k~★ Talon Knife | Doppler","k~★ Stiletto Knife | Fade"]]},
 {id:'silver',name:"Silver Elite",price:5,hue:215,cat:'meme',icon:'star',t:[
  ["m~Nova | Hyper Beast","m~XM1014 | Incinegator","p~Glock-18 | Moonrise","r~M4A1-S | Mud-Spec"],
  ["r~M4A1-S | Nightmare","r~AK-47 | Orbit Mk01","r~M4A4 | Global Offensive"],
  ["p~USP-S | Whiteout","r~AK-47 | Black Laminate","s~AWP | Man-o'-war"],
  ["r~AK-47 | Case Hardened","r~M4A4 | Poseidon"],
  ["k~★ Shadow Daggers | Doppler","k~★ Gut Knife | Marble Fade"]]},
 {id:'global',name:"Global Elite",price:5,hue:44,cat:'meme',icon:'star',t:[
  ["s~AWP | Asiimov","r~M4A4 | Asiimov","r~AK-47 | Asiimov","s~AWP | BOOM"],
  ["r~M4A1-S | Hot Rod","r~AK-47 | X-Ray","s~AWP | Graphite"],
  ["r~M4A1-S | Welcome to the Jungle","s~AWP | Desert Hydra","s~AWP | The Prince"],
  ["s~AWP | Medusa","r~AK-47 | Gold Arabesque"],
  ["k~★ Butterfly Knife | Tiger Tooth","k~★ M9 Bayonet | Doppler"]]},
 {id:'sigma',name:"Сигма-кейс",price:5,hue:220,cat:'meme',icon:'star',t:[
  ["r~AK-47 | Slate","p~Glock-18 | Winterized","r~M4A1-S | Nightmare","p~USP-S | Black Lotus"],
  ["p~USP-S | Whiteout","r~AK-47 | Black Laminate","p~Desert Eagle | Night Heist"],
  ["s~AWP | Graphite","r~M4A1-S | Printstream","p~USP-S | Printstream"],
  ["p~Desert Eagle | Printstream","r~AK-47 | X-Ray"],
  ["k~★ Classic Knife | Fade","k~★ Skeleton Knife | Crimson Web"]]},
 {id:'rizz',name:"Rizz-кейс",price:5,hue:325,cat:'meme',icon:'star',t:[
  ["p~Glock-18 | Candy Apple","m~MAC-10 | Disco Tech","m~MP9 | Food Chain","r~M4A1-S | Player Two"],
  ["s~AWP | Fever Dream","m~P90 | Death by Kitty","p~Desert Eagle | Hypnotic"],
  ["r~M4A1-S | Icarus Fell","r~AK-47 | Jet Set","s~AWP | Sun in Leo"],
  ["r~M4A1-S | Hot Rod","r~AK-47 | Wild Lotus"],
  ["k~★ Butterfly Knife | Fade","k~★ Ursus Knife | Fade"]]},
 {id:'ohio',name:"Только в Огайо",price:5,hue:70,cat:'meme',icon:'star',t:[
  ["m~Sawed-Off | The Kraken","m~MAG-7 | Bulldozer","m~Nova | Hyper Beast","m~XM1014 | Incinegator"],
  ["m~Negev | Mjölnir","s~AWP | Worm God","p~P250 | See Ya Later"],
  ["r~AK-47 | Panthera onca","r~M4A1-S | Welcome to the Jungle","s~AWP | Silk Tiger"],
  ["r~AK-47 | Hydroponic","m~P90 | Emerald Dragon"],
  ["g~★ Sport Gloves | Hedge Maze","g~★ Bloodhound Gloves | Guerrilla"]]},
 {id:'brainrot',name:"Брейнрот",price:5,hue:285,cat:'meme',icon:'star',t:[
  ["p~Desert Eagle | Light Rail","m~P90 | Asiimov","r~AK-47 | Orbit Mk01","p~Glock-18 | Moonrise"],
  ["p~Desert Eagle | Hypnotic","m~MP7 | Fade","r~M4A1-S | Player Two"],
  ["r~AK-47 | Leet Museo","s~AWP | Fever Dream","r~M4A4 | Buzz Kill"],
  ["s~AWP | Containment Breach","p~Glock-18 | Gamma Doppler"],
  ["k~★ Karambit | Gamma Doppler","k~★ Talon Knife | Fade"]]},
 {id:'stonks',name:"Stonks",price:5,hue:145,cat:'meme',icon:'star',t:[
  ["r~M4A4 | Global Offensive","r~AK-47 | Uncharted","p~Glock-18 | Winterized","p~USP-S | Black Lotus"],
  ["p~Desert Eagle | Golden Koi","r~AK-47 | Emerald Pinstripe","r~M4A1-S | Golden Coil"],
  ["s~AWP | BOOM","p~Desert Eagle | Blaze","r~AK-47 | Fuel Injector"],
  ["r~AK-47 | Gold Arabesque","s~AWP | Dragon Lore"],
  ["k~★ Karambit | Fade","k~★ Butterfly Knife | Marble Fade"]]},
 {id:'muchwow',name:"Much Wow",price:5,hue:42,cat:'meme',icon:'star',t:[
  ["p~Glock-18 | Snack Attack","m~MP9 | Food Chain","p~P250 | See Ya Later","p~Five-SeveN | Angry Mob"],
  ["r~AK-47 | Jet Set","s~AWP | Sun in Leo","p~USP-S | Orion"],
  ["s~AWP | Man-o'-war","p~Glock-18 | Dragon Tattoo","r~M4A4 | Buzz Kill"],
  ["s~AWP | Lightning Strike","r~M4A1-S | Hot Rod"],
  ["k~★ Huntsman Knife | Tiger Tooth","k~★ Flip Knife | Tiger Tooth"]]},
 {id:'fine',name:"Всё нормально",price:5,hue:22,cat:'meme',icon:'star',t:[
  ["m~XM1014 | Incinegator","p~P2000 | Fire Elemental","m~MP7 | Bloodsport","m~MAC-10 | Disco Tech"],
  ["s~AWP | Wildfire","r~M4A1-S | Chantico's Fire","p~Desert Eagle | Blaze"],
  ["r~AK-47 | Fire Serpent","s~SSG 08 | Dragonfire","s~AWP | BOOM"],
  ["r~M4A4 | Howl","s~AWP | Dragon Lore"],
  ["k~★ Karambit | Slaughter","k~★ Huntsman Knife | Slaughter"]]},
 {id:'aura',name:"+1000 ауры",price:5,hue:190,cat:'meme',icon:'star',t:[
  ["m~P90 | Asiimov","s~AWP | Exoskeleton","s~SSG 08 | Turbo Peek","p~Desert Eagle | Light Rail"],
  ["m~MP7 | Fade","s~AWP | Corticera","p~USP-S | Orion"],
  ["r~M4A1-S | Icarus Fell","s~AWP | Electric Hive","p~Glock-18 | Fade"],
  ["s~AWP | Fade","r~AK-47 | Wild Lotus"],
  ["k~★ Ursus Knife | Doppler","k~★ Stiletto Knife | Doppler"]]},
 {id:'npc',name:"NPC-кейс",price:5,hue:200,cat:'meme',icon:'star',t:[
  ["r~M4A1-S | Mud-Spec","p~Glock-18 | Winterized","r~AK-47 | Safety Net","r~AK-47 | Elite Build"],
  ["r~AK-47 | Slate","p~USP-S | Black Lotus","r~M4A1-S | Nightmare"],
  ["r~AK-47 | Orbit Mk01","r~M4A4 | Global Offensive","p~Desert Eagle | Mecha Industries"],
  ["r~AK-47 | Asiimov","r~M4A4 | Asiimov"],
  ["k~★ Gut Knife | Rust Coat","k~★ Falchion Knife | Safari Mesh"]]},
 {id:'cringe',name:"Кринж",price:5,hue:300,cat:'meme',icon:'star',t:[
  ["p~Glock-18 | Candy Apple","p~Glock-18 | Snack Attack","m~Nova | Hyper Beast","m~Sawed-Off | The Kraken"],
  ["m~P90 | Death by Kitty","p~Five-SeveN | Hyper Beast","p~Desert Eagle | Hypnotic"],
  ["p~Glock-18 | Dragon Tattoo","r~AK-47 | Jet Set","r~M4A1-S | Player Two"],
  ["s~AWP | Containment Breach","r~M4A1-S | Icarus Fell"],
  ["k~★ Navaja Knife | Fade","g~★ Moto Gloves | Smoke Out"]]},
 {id:'ggez',name:"GG EZ",price:5,hue:172,cat:'meme',icon:'star',t:[
  ["r~AK-47 | Point Disarray","p~USP-S | Cortex","m~MP9 | Hypnotic","p~Glock-18 | Bullet Queen"],
  ["r~AK-47 | Neon Revolution","r~M4A1-S | Hyper Beast","s~AWP | Hyper Beast"],
  ["r~AK-47 | Bloodsport","s~AWP | Asiimov","r~M4A4 | Asiimov"],
  ["r~M4A1-S | Printstream","p~Desert Eagle | Printstream"],
  ["k~★ Butterfly Knife | Doppler","k~★ Karambit | Tiger Tooth"]]},
 {id:'tilt',name:"Тильт",price:5,hue:0,cat:'meme',icon:'star',t:[
  ["p~Glock-18 | Winterized","r~AK-47 | Uncharted","s~AWP | Worm God","r~M4A1-S | Mud-Spec"],
  ["r~AK-47 | Rat Rod","s~AWP | Pit Viper","p~Glock-18 | Water Elemental"],
  ["r~AK-47 | Redline","s~AWP | Redline","p~Desert Eagle | Code Red"],
  ["r~AK-47 | Bloodsport","s~AWP | Oni Taiji"],
  ["g~★ Hand Wraps | Slaughter","k~★ Skeleton Knife | Crimson Web"]]},
 {id:'tokyo',name:"Неоновый Токио",price:5,hue:318,cat:'style',icon:'star',t:[
  ["m~MAC-10 | Disco Tech","m~MAC-10 | Neon Rider","m~MP9 | Food Chain","r~AK-47 | Orbit Mk01"],
  ["r~AK-47 | Neon Revolution","p~USP-S | Neo-Noir","p~Glock-18 | Neo-Noir"],
  ["r~M4A1-S | Player Two","s~AWP | Neo-Noir","p~Desert Eagle | Kumicho Dragon"],
  ["r~AK-47 | Wild Lotus","r~M4A1-S | Printstream"],
  ["k~★ Butterfly Knife | Gamma Doppler","k~★ Karambit | Lore"]]},
 {id:'desert',name:"Пустынный шторм",price:5,hue:36,cat:'style',icon:'star',t:[
  ["r~AK-47 | Safety Net","s~AWP | Pit Viper","r~M4A1-S | Mud-Spec","r~AK-47 | Uncharted"],
  ["p~Desert Eagle | Golden Koi","s~AWP | Sun in Leo","r~M4A4 | Buzz Kill"],
  ["r~AK-47 | Panthera onca","s~AWP | Asiimov","r~M4A4 | Asiimov"],
  ["s~AWP | Desert Hydra","r~M4A1-S | Welcome to the Jungle"],
  ["g~★ Hand Wraps | Badlands","g~★ Sport Gloves | Hedge Maze"]]},
 {id:'frost',name:"Ледниковый период",price:5,hue:196,cat:'style',icon:'star',t:[
  ["p~Glock-18 | Winterized","r~AK-47 | Ice Coaled","p~USP-S | Whiteout","s~AWP | Corticera"],
  ["r~AK-47 | Blue Laminate","r~M4A1-S | Icarus Fell","s~AWP | Man-o'-war"],
  ["r~AK-47 | Vulcan","r~M4A4 | Poseidon","s~AWP | Lightning Strike"],
  ["r~AK-47 | Case Hardened","s~AWP | Medusa"],
  ["g~★ Driver Gloves | Snow Leopard","g~★ Sport Gloves | Superconductor"]]},
 {id:'space',name:"Глубокий космос",price:5,hue:250,cat:'style',icon:'star',t:[
  ["r~AK-47 | Orbit Mk01","p~USP-S | Orion","s~AWP | Exoskeleton","m~P90 | Asiimov"],
  ["r~M4A1-S | Nightmare","m~MP7 | Fade","p~Glock-18 | Moonrise"],
  ["s~AWP | Electric Hive","r~M4A4 | Desolate Space","p~Glock-18 | Gamma Doppler"],
  ["s~AWP | Fade","r~AK-47 | X-Ray"],
  ["k~★ Karambit | Doppler","k~★ Talon Knife | Doppler"]]},
 {id:'dragon',name:"Логово дракона",price:5,hue:8,cat:'style',icon:'star',t:[
  ["p~Glock-18 | Dragon Tattoo","m~P90 | Emerald Dragon","m~Negev | Mjölnir","m~Sawed-Off | The Kraken"],
  ["s~SSG 08 | Dragonfire","p~Desert Eagle | Kumicho Dragon","s~AWP | Silk Tiger"],
  ["r~AK-47 | Fire Serpent","s~AWP | Wildfire","p~Glock-18 | Fade"],
  ["s~AWP | Dragon Lore","r~M4A4 | Howl"],
  ["k~★ Karambit | Fade","k~★ Bayonet | Lore"]]}
];
const RANKS=[[20,'Бронза','#cd8a4b'],[50,'Серебро','#b8c4d8'],[150,'Золото','#e4ae39'],[400,'Платина','#7fd6e6'],[800,'Алмаз','#7c9cff'],[1e9,'Легенда','#ff6b8b']];
const rankOf=p=>RANKS.find(r=>p<=r[0]||p<r[0]+1e-9&&false)||RANKS[RANKS.length-1];
function rank(p){for(const r of RANKS)if(p<r[0])return r;return RANKS[RANKS.length-1]}
/* ---------- Steam Market prices ---------- */
/* approximate Steam Market price in USD for the "Field-Tested" version (agents: one price). Other wears use WEARS[].m */
const PRICE={
 'P2000 | Fire Elemental':9,'MP7 | Bloodsport':4,'SSG 08 | Blood in the Water':30,'Desert Eagle | Code Red':40,
 'AK-47 | Redline':30,"M4A1-S | Chantico's Fire":30,'AWP | Wildfire':70,'AK-47 | Bloodsport':45,'Desert Eagle | Blaze':550,
 'AWP | Oni Taiji':150,'AK-47 | Fire Serpent':900,'M4A4 | Howl':5000,'★ Karambit | Crimson Web':1000,'★ Butterfly Knife | Crimson Web':1500,
 'Glock-18 | Water Elemental':4,'USP-S | Cortex':4,'MP9 | Hypnotic':15,'SCAR-20 | Cyrex':2,'AK-47 | Vulcan':300,'M4A4 | Desolate Space':12,
 'AWP | Lightning Strike':300,'AK-47 | Frontside Misty':25,'M4A1-S | Cyrex':12,'USP-S | Kill Confirmed':60,'AWP | Electric Hive':60,
 'AK-47 | Case Hardened':300,'★ Karambit | Doppler':1200,'★ M9 Bayonet | Case Hardened':500,
 'Bio-Haz Specialist | SWAT':1.5,'Operator | FBI SWAT':1,'Soldier | Phoenix':1,"'Blueberries' Buckshot | NSWC SEAL":2,'Dragomir | Sabre':3,
 "Cmdr. Davida 'Goggles' Fernandez | SEAL Frogman":6,'Lt. Commander Ricksaw | NSWC SEAL':8,"Cmdr. Mae 'Dead Cold' Jamison | SWAT":20,
 "'The Doctor' Romanov | Sabre":10,'Getaway Sally | The Professionals':8,'Number K | The Professionals':12,'Col. Mangos Dabisi | Guerrilla Warfare':6,
 'Special Agent Ava | FBI':20,'Sir Bloody Miami Darryl | The Professionals':15,
 'MAC-10 | Neon Rider':6,'Tec-9 | Fuel Injector':3,'Galil AR | Chatterbox':25,'SSG 08 | Dragonfire':15,'M4A1-S | Hyper Beast':15,
 'AK-47 | Neon Revolution':25,'USP-S | Caiman':8,'AWP | Hyper Beast':40,'AK-47 | Fuel Injector':70,'Glock-18 | Gamma Doppler':150,
 'AWP | Medusa':3000,'M4A1-S | Printstream':100,'★ Karambit | Gamma Doppler':1500,'★ Bayonet | Gamma Doppler':600,
 '★ Hand Wraps | Overprint':150,'★ Sport Gloves | Hedge Maze':1200,'★ Driver Gloves | Lunar Weave':300,'★ Specialist Gloves | Forest DDPAT':120,
 '★ Moto Gloves | Boom!':250,'★ Bloodhound Gloves | Charred':200,'★ Hydra Gloves | Emerald':120,'★ Specialist Gloves | Crimson Kimono':1000,
 '★ Driver Gloves | King Snake':400,'★ Sport Gloves | Vice':1500,"★ Sport Gloves | Pandora's Box":2500,'★ Hand Wraps | Cobalt Skulls':250,
 '★ Specialist Gloves | Emerald Web':800,'★ Moto Gloves | Spearmint':900,
 'UMP-45 | Primal Saber':3,'Glock-18 | Neo-Noir':3,'P90 | Death by Kitty':40,'FAMAS | Roll Cage':3,'M4A4 | Neo-Noir':15,'AWP | Neo-Noir':30,
 'USP-S | Neo-Noir':12,'Desert Eagle | Kumicho Dragon':15,'M4A4 | The Emperor':40,'AWP | Fade':1200,'AK-47 | Wild Lotus':9000,
 '★ Butterfly Knife | Doppler':1700,'★ Karambit | Lore':1700,
 'AK-47 | Elite Build':2,'AK-47 | Slate':4,'AK-47 | Safety Net':2,'AK-47 | Point Disarray':15,'AK-47 | Phantom Disruptor':5,'AK-47 | Jaguar':60,
 'AK-47 | Aquamarine Revenge':25,'AK-47 | The Empress':40,'AK-47 | Asiimov':60,'AK-47 | Hydroponic':150,'AK-47 | Gold Arabesque':3000,
 'P250 | Muertos':3,'PP-Bizon | Judgement of Anubis':6,'Five-SeveN | Hyper Beast':8,'Glock-18 | Fade':1500,'AWP | Containment Breach':70,
 '★ Butterfly Knife | Fade':2000,'★ Karambit | Tiger Tooth':1200,
 'Slingshot | Phoenix':1,'Maximus | Sabre':1,'Trapper | Guerrilla Warfare':3,'Ground Rebel | Elite Crew':2,'Osiris | Elite Crew':2,
 'Prof. Shahmat | Elite Crew':3,'Rezan The Ready | Sabre':5,'Safecracker Voltzmann | The Professionals':8,'Michael Syfers | FBI Sniper':10,
 '3rd Commando Company | KSK':4,'Bloody Darryl The Strapped | The Professionals':5,'Aspirant | Gendarmerie Nationale':2,
 'Sir Bloody Darryl Royale | The Professionals':15,
 'AWP | Pit Viper':2,'AWP | Atheris':6,'AWP | Elite Build':10,'AWP | Mortis':8,'AWP | Asiimov':120,'AWP | Redline':40,'AWP | Gungnir':9000,
 'AWP | Dragon Lore':10000,
 '★ Hydra Gloves | Case Hardened':150,'★ Driver Gloves | Imperial Plaid':250,'★ Moto Gloves | Turtle':120,'★ Bloodhound Gloves | Snakebite':150,
 '★ Specialist Gloves | Mogul':250,'★ Sport Gloves | Amphibious':400,'★ Hand Wraps | Giraffe':120,'★ Moto Gloves | Cool Mint':500,
 '★ Driver Gloves | Crimson Weave':600,'★ Sport Gloves | Nocts':700,'★ Specialist Gloves | Marble Fade':900,'★ Broken Fang Gloves | Jade':350,
 '★ Bayonet | Forest DDPAT':180,'★ Flip Knife | Urban Masked':150,'★ Gut Knife | Rust Coat':80,'★ Falchion Knife | Safari Mesh':90,
 '★ Huntsman Knife | Slaughter':300,'★ Bowie Knife | Night':150,'★ Shadow Daggers | Fade':200,'★ Flip Knife | Doppler':450,
 '★ Gut Knife | Marble Fade':200,'★ M9 Bayonet | Tiger Tooth':700,'★ Karambit | Fade':1800,'★ Butterfly Knife | Marble Fade':1800,
 'M4A1-S | Golden Coil':70,'UMP-45 | Gold Bismuth':5,'★ Flip Knife | Lore':300,'★ Huntsman Knife | Fade':300,'★ Bayonet | Doppler':500,
 '★ Bowie Knife | Case Hardened':250,'★ Butterfly Knife | Gamma Doppler':1500,'★ Karambit | Case Hardened':1500,
 '★ Karambit | Forest DDPAT':500,'★ Karambit | Night':600,'★ Karambit | Scorched':450,'★ Karambit | Safari Mesh':450,'★ Karambit | Blue Steel':900,
 '★ Karambit | Stained':800,'★ Karambit | Slaughter':1000,'★ Karambit | Marble Fade':1500,'★ Specialist Gloves | Fade':1200,'★ M9 Bayonet | Crimson Web':800,
 /* Kilowatt */
 'Dual Berettas | Hideout':.3,'MAC-10 | Light Box':.4,'SSG 08 | Dezastre':.3,'UMP-45 | Motorized':.3,'Glock-18 | Block-18':2,'M4A4 | Etch Lord':3,
 'Five-SeveN | Hybrid':2,'M4A1-S | Black Lotus':12,'Zeus x27 | Olympus':10,'USP-S | Jawbreaker':8,'AWP | Chrome Cannon':50,'AK-47 | Inheritance':60,
 '★ Kukri Knife | Fade':400,'★ Kukri Knife | Crimson Web':250,
 /* Revolution */
 'MAG-7 | Insomnia':.2,'MP9 | Featherweight':.3,'SG 553 | Cyberforce':.3,'Tec-9 | Rebel':.2,'M4A1-S | Emphorosaur-S':3,'Glock-18 | Umbral Rabbit':3,
 'P90 | Neoqueen':3,'AWP | Duality':8,'UMP-45 | Wild Child':5,'P2000 | Wicked Sick':6,'M4A4 | Temukau':40,'AK-47 | Head Shot':45,
 '★ Specialist Gloves | Crimson Web':500,'★ Moto Gloves | POW!':500,
 /* Dreams & Nightmares */
 'Five-SeveN | Scrawl':.2,'MAC-10 | Ensnared':.2,'MP5-SD | Necro Jr.':.2,'P2000 | Lifted Spirits':.2,'PP-Bizon | Space Cat':1.5,
 'M4A1-S | Night Terror':1.5,'USP-S | Ticket to Hell':2,'Dual Berettas | Melondrama':4,'FAMAS | Rapid Eye Movement':5,'MP7 | Abyssal Apparition':5,
 'AK-47 | Nightwish':50,'MP9 | Starlight Protector':20,'★ Butterfly Knife | Lore':2000,'★ Bowie Knife | Gamma Doppler':300,
 /* Fracture */
 'P2000 | Gnarled':.2,'SSG 08 | Mainframe 001':.2,'P250 | Cassette':.2,'P90 | Freight':.2,'MAG-7 | Monster Call':1,'MAC-10 | Allure':1,
 'Galil AR | Connexion':1,'M4A4 | Tooth Fairy':8,'Glock-18 | Vogue':6,'XM1014 | Entombed':5,'Desert Eagle | Printstream':60,
 'AK-47 | Legion of Anubis':30,'★ Skeleton Knife | Fade':1000,'★ Paracord Knife | Fade':300,
 /* skins added for the meme and style cases */
 'AWP | The Prince':1800,'USP-S | Printstream':50,'Glock-18 | Wasteland Rebel':30,'Desert Eagle | Ocean Drive':50,'M4A1-S | Hot Rod':600,
 'AK-47 | X-Ray':300,'AK-47 | Panthera onca':300,'M4A1-S | Welcome to the Jungle':1000,'AWP | Desert Hydra':1300,'AK-47 | Leet Museo':50,
 'M4A4 | Poseidon':250,'AWP | Graphite':300,'Glock-18 | Bullet Queen':15,'USP-S | Whiteout':30,'Desert Eagle | Mecha Industries':7,
 'P250 | See Ya Later':6,'Five-SeveN | Angry Mob':6,'AK-47 | Ice Coaled':10,'M4A1-S | Player Two':15,'AWP | Fever Dream':15,'MP9 | Food Chain':3,
 'MAC-10 | Disco Tech':3,'P90 | Asiimov':4,'M4A4 | Asiimov':100,'USP-S | The Traitor':25,'Desert Eagle | Light Rail':2,'Glock-18 | Moonrise':2,
 'AWP | Exoskeleton':3,'SSG 08 | Turbo Peek':3,'Nova | Hyper Beast':2,'XM1014 | Incinegator':3,'AK-47 | Orbit Mk01':7,'Glock-18 | Snack Attack':4,
 'M4A1-S | Mud-Spec':1,'★ Talon Knife | Fade':900,'★ Ursus Knife | Fade':350,'★ Stiletto Knife | Fade':500,'★ Navaja Knife | Fade':250,
 '★ Classic Knife | Fade':550,'★ Talon Knife | Doppler':800,'★ Skeleton Knife | Crimson Web':600,'★ Butterfly Knife | Tiger Tooth':1800,
 '★ M9 Bayonet | Doppler':900,'★ Karambit | Autotronic':1200,'★ Bayonet | Lore':450,'★ Sport Gloves | Superconductor':900,
 '★ Driver Gloves | Snow Leopard':600,'★ Specialist Gloves | Lt. Commander':350,'★ Hand Wraps | Slaughter':500,'AK-47 | Blue Laminate':15,
 'AK-47 | Emerald Pinstripe':10,'AWP | Sun in Leo':15,'Desert Eagle | Golden Koi':30,'M4A4 | Buzz Kill':20,"AWP | Man-o'-war":15,
 'Glock-18 | Candy Apple':3,'AK-47 | Black Laminate':15,'P250 | Asiimov':4,'Glock-18 | Dragon Tattoo':25,'Desert Eagle | Hypnotic':40,'AWP | BOOM':120,
 'M4A1-S | Icarus Fell':60,'AK-47 | Jet Set':30,'USP-S | Orion':10,'AWP | Corticera':15,'MP7 | Fade':25,'★ Ursus Knife | Doppler':350,
 '★ Flip Knife | Tiger Tooth':350,'★ Gut Knife | Doppler':150,'★ Shadow Daggers | Doppler':200,'★ Navaja Knife | Doppler':200,'★ Bowie Knife | Fade':300,
 '★ Falchion Knife | Fade':250,'★ Huntsman Knife | Tiger Tooth':250,'★ Stiletto Knife | Doppler':600,'★ Moto Gloves | Smoke Out':200,
 '★ Hand Wraps | Badlands':150,'★ Hydra Gloves | Rattler':120,'★ Bloodhound Gloves | Guerrilla':150,'AK-47 | Uncharted':2,'M4A4 | Global Offensive':6,
 'Desert Eagle | Night Heist':25,'USP-S | Black Lotus':10,'AWP | Silk Tiger':15,'M4A1-S | Nightmare':4,'AK-47 | Rat Rod':6,'Glock-18 | Winterized':1,
 'AWP | Worm God':3,'P90 | Emerald Dragon':50,'MAG-7 | Bulldozer':2,'Negev | Mjölnir':70,'Sawed-Off | The Kraken':8,
 "M4A4 | Choppa":0.55,"MAG-7 | Resupply":0.28,"SSG 08 | Memorial":0.28,"P2000 | Sure Grip":0.39,"USP-S | PC-GRN":1.21,"MP9 | Nexus":0.54,"XM1014 | Mockingbird":0.46,"Desert Eagle | Serpent Strike":1.74,"Zeus x27 | Tosai":1.07,"Nova | Rising Sun":3.14,"Galil AR | Control":0.8,"P90 | Wave Breaker":1.63,"AK-47 | Searing Rage":22.05,"Glock-18 | Shinobu":9.52,"UMP-45 | K.O. Factory":11.29,"FAMAS | Bad Trip":55.2,"AWP | Printstream":143,"★ Nomad Knife | Doppler":721,"★ Skeleton Knife | Doppler":826,"★ Paracord Knife | Doppler":1208,"★ Survival Knife | Doppler":1322,"USP-S | 27":0.78,"Desert Eagle | Calligraffiti":0.88,"MP5-SD | Statics":0.41,"AUG | Luxe Trim":0.13,"M249 | Hypnosis":0.59,"R8 Revolver | Tango":0.54,"SCAR-20 | Trail Blazer":0.15,"M4A4 | Turbine":2.17,"Dual Berettas | Hydro Strike":2.83,"MAC-10 | Saibā Oni":1.2,"P90 | Randy Rush":2.34,"SSG 08 | Rapid Transit":0.97,"AK-47 | The Outsiders":20.08,"P250 | Epicenter":5.25,"UMP-45 | Neo-Noir":10.69,"Glock-18 | Gold Toof":71.52,"M4A1-S | Vaporwave":69.0,"FAMAS | Meow 36":0.17,"Galil AR | Destroyer":0.49,"M4A4 | Poly Mag":0.59,"MAC-10 | Monkeyflage":0.61,"Negev | Drop Me":0.13,"UMP-45 | Roadblock":0.56,"R8 Revolver | Crazy 8":2.7,"M249 | Downtown":1.7,"SG 553 | Dragon Tech":2.12,"P90 | Vent Rush":1.0,"Dual Berettas | Flora Carnivora":2.85,"P250 | Visions":8.61,"Sawed-Off | Kiss♥Love":6.58,"AWP | Chromatic Aberration":105,"★ Moto Gloves | 3rd Commando Company":198,"★ Sport Gloves | Scarlet Shamagh":274,"★ Driver Gloves | Rezan the Red":320,"SG 553 | Heavy Metal":0.4,"Glock-18 | Clear Polymer":0.31,"M249 | O.S.I.P.R.":0.17,"CZ75-Auto | Circaetus":0.33,"UMP-45 | Oscillator":0.18,"R8 Revolver | Junk Yard":0.45,"Nova | Windblown":0.56,"P250 | Cyber Shell":0.86,"Negev | dev_texture":1.71,"MAC-10 | Button Masher":2.99,"Desert Eagle | Trigger Discipline":1.77,"XM1014 | XOXO":9.42,"Galil AR | Chromatic Aberration":12.19,"M4A4 | In Living Color":114,"AUG | Plague":0.21,"Dual Berettas | Tread":0.12,"G3SG1 | Keeping Tabs":0.54,"MP7 | Guerrilla":0.25,"PP-Bizon | Lumen":0.35,"XM1014 | Watchdog":0.16,"MAG-7 | BI83 Spectrum":1.02,"FAMAS | ZX Spectron":2.91,"Five-SeveN | Boost Protocol":2.66,"MP9 | Mount Fuji":2.55,"M4A4 | Spider Lily":5.79,"MAC-10 | Toybox":11.53,"★ Shadow Daggers | Gamma Doppler":852,"★ Falchion Knife | Gamma Doppler":908,"★ Huntsman Knife | Gamma Doppler":1004,"CZ75-Auto | Vendetta":0.17,"P90 | Cocoa Rampage":0.54,"G3SG1 | Digital Mesh":0.21,"Galil AR | Vandal":0.17,"P250 | Contaminant":0.35,"M249 | Deep Relief":0.22,"MP5-SD | Condition Zero":0.42,"Dual Berettas | Dezastre":2.62,"Nova | Clear Polymer":1.41,"SSG 08 | Parallax":1.18,"Five-SeveN | Fairy Tale":9.67,"M4A4 | Cyber Security":19.43,"USP-S | Monster Mashup":25.82,"AUG | Tom Cat":0.52,"AWP | Capillary":1.02,"CZ75-Auto | Distressed":0.57,"Desert Eagle | Blue Ply":0.26,"MP5-SD | Desert Strike":0.45,"Negev | Prototype":0.3,"R8 Revolver | Bone Forged":0.21,"P2000 | Acid Etched":1.51,"Sawed-Off | Apocalypto":1.32,"SCAR-20 | Enforcer":1.74,"SG 553 | Darkwing":2.84,"SSG 08 | Fever Dream":2.28,"MAG-7 | Justice":10.62,"Dual Berettas | Elite 1.6":0.17,"Tec-9 | Flash Out":0.53,"MAC-10 | Classic Crate":0.47,"MAG-7 | Popdog":0.33,"SCAR-20 | Assault":0.28,"FAMAS | Decommissioned":0.56,"Glock-18 | Sacrifice":1.1,"M249 | Aztec":1.79,"MP5-SD | Agent":0.79,"Five-SeveN | Buddy":2.11,"P250 | Inferno":1.61,"UMP-45 | Plastique":2.37,"MP9 | Hydra":9.86,"P90 | Nostalgia":8.42,"AUG | Death by Puppy":11.58,"FAMAS | Commemoration":54.0,"PP-Bizon | Night Riot":0.27,"Five-SeveN | Flame Test":0.35,"MP9 | Black Sand":0.52,"P2000 | Urban Hazard":0.37,"R8 Revolver | Grip":0.26,"SG 553 | Aloha":0.49,"XM1014 | Oxide Blaze":0.29,"Negev | Lionfish":3.13,"Nova | Wild Six":2.04,"MAG-7 | SWAG-7":2.3,"UMP-45 | Arctic Wolf":1.08,"AUG | Stymphalian":9.54,"★ Moto Gloves | Polygon":183,"MP9 | Modest Threat":0.17,"Glock-18 | Oxide Blaze":0.89,"Nova | Wood Fired":0.46,"M4A4 | Magnesium":1.1,"Sawed-Off | Black Sand":0.55,"SG 553 | Danger Close":0.49,"Tec-9 | Fubar":0.23,"G3SG1 | Scavenger":1.81,"Galil AR | Signal":1.41,"MAC-10 | Pipe Down":1.57,"P250 | Nevermore":2.43,"USP-S | Flashback":3.82,"UMP-45 | Momentum":14.42,"MP5-SD | Phosphor":5.56,"AUG | Amber Slipstream":0.34,"Dual Berettas | Shred":0.29,"Glock-18 | Warhawk":0.77,"MP9 | Capillary":0.49,"P90 | Traction":0.15,"R8 Revolver | Survivalist":0.58,"Tec-9 | Snek-9":0.32,"CZ75-Auto | Eco":1.49,"G3SG1 | High Seas":1.9,"Nova | Toy Soldier":1.05,"AWP | PAW":2.23,"MP7 | Powercore":2.92,"Sawed-Off | Devourer":12.3,"FAMAS | Eye of Athena":11.35,"AK-47 | Neon Rider":69.84,"MP7 | Armor Core":0.51,"Desert Eagle | Bronze Deco":0.46,"P250 | Valence":0.58,"Negev | Man-o'-war":0.59,"Sawed-Off | Origami":0.45,"MAG-7 | Heat":1.22,"CZ75-Auto | Pole Position":2.78,"UMP-45 | Grand Prix":2.85,"Five-SeveN | Monkey Business":10.35,"Galil AR | Eco":13.69,"FAMAS | Djinn":6.93,"CZ75-Auto | Imprint":0.23,"Five-SeveN | Scumbria":0.31,"G3SG1 | Ventilator":0.31,"Negev | Dazzle":0.13,"P90 | Grim":0.3,"UMP-45 | Briefing":0.2,"XM1014 | Slipstream":0.14,"Desert Eagle | Directive":5.76,"Glock-18 | Weasel":5.03,"MAG-7 | Petroglyph":1.23,"SCAR-20 | Powercore":1.76,"SG 553 | Triarch":1.48,"AUG | Syd Mead":6.16,"MP9 | Airlock":9.44,"★ Gut Knife | Gamma Doppler":499,"★ M9 Bayonet | Gamma Doppler":1177,"Sawed-Off | Morris":0.37,"AUG | Triqua":0.28,"G3SG1 | Hunter":0.58,"Glock-18 | Off World":1.02,"MAC-10 | Oceanic":0.18,"Tec-9 | Cracked Opal":0.51,"SCAR-20 | Jungle Slipstream":0.49,"MP9 | Goo":2.97,"SG 553 | Phantom":1.89,"CZ75-Auto | Tacticat":2.85,"UMP-45 | Exposure":1.14,"XM1014 | Ziggy":2.32,"PP-Bizon | High Roller":11.82,"M4A1-S | Leaded Glass":22.7,"R8 Revolver | Llama Cannon":10.63,"★ Huntsman Knife | Doppler":1200,"★ Falchion Knife | Doppler":1286,"MP7 | Skulls":0.4,"AUG | Wings":0.39,"SG 553 | Ultraviolet":0.54,"USP-S | Dark Water":3.97,"M4A1-S | Dark Water":3.17,"★ Flip Knife | Fade":328,"★ Gut Knife | Fade":435,"★ M9 Bayonet | Fade":699
};
/* old names saved in inventories before the rename */
const RENAME={'MP9 | Gold Bismuth':'UMP-45 | Gold Bismuth','★ Karambit | Night Stripe':'★ Karambit | Night','★ Bowie Knife | Night Stripe':'★ Bowie Knife | Night'};
const ST_P=.1,ST_M=1.5,PAYOUT=.9;
const WEAR_AVG=(()=>{let lo=0,s=0;WEARS.forEach(w=>{const hi=Math.min(1,w.max);s+=(hi-lo)*w.m;lo=hi});return s})();
const fmtPrice=v=>v>=100?Math.round(v):Math.round(v*100)/100;
const noWear=w=>w==='a';
const noST=w=>w==='a'||w==='g';
function priceOf(base,w,wr,st){return fmtPrice(base*(noWear(w)?1:wr.m)*(st?ST_M:1))}
const avgMult=w=>(noWear(w)?1:WEAR_AVG)*(noST(w)?1:1+ST_P*(ST_M-1));
const niceCase=v=>v<10?Math.ceil(v*2)/2:v<100?Math.ceil(v):Math.ceil(v/5)*5;
const fmtCh=p=>p>=10?p.toFixed(1)+'%':p>=1?p.toFixed(2)+'%':p>=.01?p.toFixed(3)+'%':'<0.01%';
D.forEach(c=>{
  c.list={};c.all=[];
  TIERS.forEach((k,ti)=>{
    c.list[k]=c.t[ti].map((s,i)=>{
      const [w,name]=s.split('~');
      const it={id:c.id+k+i,w,name,rar:k,base:PRICE[name]||1};
      it.val=it.base*avgMult(w);c.all.push(it);return it;
    });
  });
  /* each item gets its own chance: weight = value^-a, a chosen so the case pays back about 90% of its price */
  const vals=c.all.map(x=>x.val),minV=Math.min(...vals);
  const ev=a=>{let sw=0,se=0;vals.forEach(v=>{const w=Math.pow(v,-a);sw+=w;se+=w*v});return se/sw};
  c.price=niceCase(Math.max(c.price,minV*1.6));
  if(ev(-.5)<c.price*PAYOUT)c.price=niceCase(ev(0)/PAYOUT);
  const gold=c.list.gld.map(x=>x.val);
  const solve=()=>{const target=c.price*PAYOUT;let lo=-.5,hi=12;for(let i=0;i<60;i++){const m=(lo+hi)/2;if(ev(m)>target)lo=m;else hi=m}return (lo+hi)/2};
  const goldShare=a=>{let sw=0,sg=0;vals.forEach(v=>sw+=Math.pow(v,-a));gold.forEach(v=>sg+=Math.pow(v,-a));return sg/sw*100};
  /* a case whose top items are almost impossible to get is no fun: raise the price until the rare tier has at least 0.25% */
  let a=solve();
  for(let i=0;i<40&&goldShare(a)<.25;i++){c.price=niceCase(c.price*1.15);a=solve()}
  let sw=0;c.all.forEach(x=>{x.wt=Math.pow(x.val,-a);sw+=x.wt});
  c.all.forEach(x=>{x.chance=x.wt/sw*100});
  c.tc={};TIERS.forEach(k=>{c.tc[k]=c.list[k].reduce((s,x)=>s+x.chance,0)});
  c.min=Math.min(...c.all.map(x=>priceOf(x.base,x.w,WEARS[WEARS.length-1],false)));
  c.max=Math.max(...c.all.map(x=>priceOf(x.base,x.w,WEARS[0],!noST(x.w))));
  c.ev=ev(a)/c.price;
});
const CASES=D;
const CASE=id=>CASES.find(c=>c.id===id);
/* every skin on the site, once (used by upgrades and the battle pass) */
const SKINS=(()=>{const m={};CASES.forEach(c=>c.all.forEach(x=>{const o=m[x.name];if(!o||RAR[x.rar].ord>RAR[o.rar].ord)m[x.name]={name:x.name,w:x.w,rar:x.rar,base:x.base}}));return Object.values(m).sort((a,b)=>a.base-b.base)})();
const SKIN=n=>SKINS.find(s=>s.name===n);

function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296}}
const BP_MAX=30,BP_XP=100,BP_PREM=1500;
const BP_ITEMS={free:{5:'AK-47 | Redline',10:'M4A1-S | Printstream',15:'AWP | Asiimov',20:'AK-47 | Asiimov',25:'★ Gut Knife | Rust Coat',30:'★ Karambit | Doppler'},
  prem:{5:'AWP | Hyper Beast',10:'★ Specialist Gloves | Crimson Kimono',15:'★ Flip Knife | Doppler',20:'AK-47 | Fire Serpent',25:'★ Butterfly Knife | Doppler',30:'AWP | Dragon Lore'}};
function bpReward(tr,l){
  const n=BP_ITEMS[tr][l];
  if(n)return {t:'item',name:n};
  /* money comes only from the admin, so every level gives a skin worth about $25×level (premium ×3) */
  const want=(tr==='free'?25:75)*l,pool=SKINS.filter(s=>s.w!=='a');
  return {t:'item',name:pool.reduce((a,b)=>Math.abs(Math.log(b.base/want))<Math.abs(Math.log(a.base/want))?b:a).name};
}
const TASKS_D=[
  {id:'open5',txt:'Открой 5 кейсов',key:'open',goal:5,xp:60},
  {id:'open15',txt:'Открой 15 кейсов',key:'open',goal:15,xp:120},
  {id:'paid3',txt:'Открой 3 кейса за баланс',key:'paid',goal:3,xp:100},
  {id:'spend100',txt:'Потрать $100 на кейсы',key:'spend',goal:100,xp:120,money:1},
  {id:'covert',txt:'Выбей тайный или редкий предмет',key:'covert',goal:1,xp:150},
  {id:'st',txt:'Выбей предмет StatTrak™',key:'st',goal:1,xp:100},
  {id:'up1',txt:'Сделай апгрейд',key:'up',goal:1,xp:80},
  {id:'upwin',txt:'Выиграй апгрейд',key:'upwin',goal:1,xp:120},
  {id:'sell50',txt:'Продай предметов на $50',key:'sell',goal:50,xp:80,money:1},
  {id:'cases3',txt:'Открой 3 разных кейса',key:'cases',goal:3,xp:100},
  {id:'knife',txt:'Выбей нож или перчатки',key:'knife',goal:1,xp:200},
  {id:'real',txt:'Открой оригинальный кейс CS2',key:'real',goal:1,xp:60}
];
const TASKS_W=[
  {id:'w_open',txt:'Открой 100 кейсов',key:'open',goal:100,xp:500},
  {id:'w_up',txt:'Выиграй 5 апгрейдов',key:'upwin',goal:5,xp:400},
  {id:'w_drop',txt:'Выбей предметов на $1 000',key:'dropsum',goal:1000,xp:450,money:1},
  {id:'w_spend',txt:'Потрать $1 000 на кейсы',key:'spend',goal:1000,xp:400,money:1},
  {id:'w_knife',txt:'Выбей 3 ножа или перчатки',key:'knife',goal:3,xp:500},
  {id:'w_cases',txt:'Открой 8 разных кейсов',key:'cases',goal:8,xp:350}
];
const dayKey=()=>{const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()};
const weekKey=()=>{const d=new Date();const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const day=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-day);const y=new Date(Date.UTC(t.getUTCFullYear(),0,1));return t.getUTCFullYear()+'-w'+Math.ceil(((t-y)/864e5+1)/7)};
function pick(pool,n,seed){const r=rng(hash(seed)),a=pool.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a.slice(0,n)}
/* ---------- items ---------- */
function wearOf(f){return WEARS.find(w=>f<w.max)}
function newUid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,9)}
function makeItem(t,caseId,opt){
  opt=opt||{};
  const f=opt.float!=null?opt.float:Math.random(),wr=wearOf(f),isAg=t.w==='a';
  const st=opt.st!=null?opt.st:(!noST(t.w)&&Math.random()<ST_P);
  return {uid:newUid(),id:t.id||t.name,caseId,name:t.name,w:t.w,rar:t.rar,float:isAg?0:+f.toFixed(4),wear:isAg?'':wr.s,wearName:isAg?'':wr.n,st,price:priceOf(t.base,t.w,wr,st),ts:Date.now()};
}
function makeDrop(c){
  let r=Math.random()*100,t=c.all[0];
  for(const x of c.all){r-=x.chance;if(r<0){t=x;break}}
  return makeItem(t,c.id);
}
const split=n=>{const i=n.indexOf(' | ');return i<0?[n,'']:[n.slice(0,i),n.slice(i+3)]};

/* ---------- upgrade ---------- */
const UP_EDGE=.92,UP_MAX=80;
const upChance=(a,b)=>!a||!b?0:Math.min(UP_MAX,a.price/b.base*100*UP_EDGE);

/* ---------- battle pass (rules work on a player object u) ---------- */
function freshUser(){return {bal:0,inv:[],opened:0,spent:0,found:0,best:null,bp:null,td:null,tw:null}}
function ensureBP(u){
  u.bp=u.bp||{xp:0,prem:false,got:{free:[],prem:[]}};
  const dk=dayKey(),wk=weekKey();
  if(!u.td||u.td.k!==dk)u.td={k:dk,p:{},seen:{},done:{}};
  if(!u.tw||u.tw.k!==wk)u.tw={k:wk,p:{},seen:{},done:{}};
}
const bpLevel=u=>Math.min(BP_MAX,Math.floor(((u.bp&&u.bp.xp)||0)/BP_XP));
const dailyTasks=u=>pick(TASKS_D,4,'d'+u.td.k);
const weeklyTasks=u=>pick(TASKS_W,3,'w'+u.tw.k);
function addXP(u,n){ensureBP(u);const b=bpLevel(u);u.bp.xp+=n;return bpLevel(u)>b?bpLevel(u):0}
function track(u,ev,v){
  ensureBP(u);let up=0;
  [u.td,u.tw].forEach(T=>{
    const add=(k,n)=>{T.p[k]=Math.round(((T.p[k]||0)+n)*100)/100};
    if(ev==='open'){add('open',v.n);if(v.paid){add('paid',v.n);add('spend',v.cost)}if(v.cat==='real')add('real',v.n);T.seen[v.cid]=1;T.p.cases=Object.keys(T.seen).length}
    if(ev==='drop'){if(v.rar==='cov'||v.rar==='gld')add('covert',1);if(v.st)add('st',1);if(v.w==='k'||v.w==='g')add('knife',1);add('dropsum',v.price)}
    if(ev==='up'){add('up',1);if(v.win)add('upwin',1)}
    if(ev==='sell')add('sell',v);
  });
  if(ev==='open'&&v.paid)up=addXP(u,8*v.n+Math.floor(v.cost/10));
  if(ev==='up')up=addXP(u,v.win?15:5);
  return up;
}
const TASK=id=>TASKS_D.find(t=>t.id===id)||TASKS_W.find(t=>t.id===id);

if(typeof module!=='undefined')module.exports={RAR,TIERS,WEARS,CATS,CASES,CASE,SKINS,SKIN,PRICE,RENAME,priceOf,wearOf,makeItem,makeDrop,split,
  upChance,UP_MAX,BP_MAX,BP_XP,BP_PREM,bpReward,TASKS_D,TASKS_W,TASK,freshUser,ensureBP,bpLevel,dailyTasks,weeklyTasks,addXP,track,hash,newUid};
