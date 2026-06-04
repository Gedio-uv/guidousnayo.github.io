/**
 * music.js — Tolk Music Feature (YouTube Integration)
 * YouTube player, synced karaoke lyrics, word lookup, vocabulary quiz.
 */

import { lookupWord } from './search.js';
import { speak, stopSpeech } from './speech.js';

const YOUTUBE_API_KEY = ''; // Add your YouTube Data API v3 Key here

// ── State ──
let currentSong   = null;
let currentMode   = 'original'; // 'original' | 'german' | 'bilingual'
let quizActive    = false;
let quizWords     = [];
let quizIndex     = 0;
let appState      = null; // injected from app.js

let ytPlayer      = null;
let syncInterval  = null;
let currentActiveLineIndex = -1;

// ── DOM shortcuts ──
const $ = id => document.getElementById(id);

// ── Native Language Config ──
const userLangFull = navigator.language || 'es-ES';
const userLangCode = userLangFull.split('-')[0]; // e.g., 'es', 'en'
let nativeLangName = 'Translation';
try {
  nativeLangName = new Intl.DisplayNames([userLangFull], { type: 'language' }).of(userLangCode);
  nativeLangName = nativeLangName.charAt(0).toUpperCase() + nativeLangName.slice(1);
} catch(e) {
  nativeLangName = userLangCode.toUpperCase();
}

// ── Hardcoded Option B Suggestions ──
const YT_SUGGESTIONS = [
  {
    videoId: '2oV1KwiTrdM',
    title: '99 Luftballons',
    artist: 'Nena',
    level: 'A2',
    lyrics: {
      original: [
        { line: "Hast du etwas Zeit für mich", timestamp: 0 },
        { line: "Dann singe ich ein Lied für dich", timestamp: 3 },
        { line: "Von 99 Luftballons", timestamp: 6 },
        { line: "Auf ihrem Weg zum Horizont", timestamp: 9 },
        { line: "Denkst du vielleicht grad' an mich", timestamp: 12 },
        { line: "Dann singe ich ein Lied für dich", timestamp: 15 },
        { line: "Von 99 Luftballons", timestamp: 18 },
        { line: "Und dass sowas von sowas kommt", timestamp: 21 },
        { line: "99 Luftballons", timestamp: 24 },
        { line: "Auf ihrem Weg zum Horizont", timestamp: 27 },
        { line: "Hielt man für Ufo's aus dem All", timestamp: 30 },
        { line: "Drum schickte ein General", timestamp: 33 },
        { line: "'ne Fliegerstaffel hinterher,", timestamp: 36 },
        { line: "Alarm zu geben, wenn's so wär'", timestamp: 39 },
        { line: "Dabei war'n dort am Horizont", timestamp: 42 },
        { line: "Nur 99 Luftballons.", timestamp: 45 },
        { line: "99 Düsenflieger", timestamp: 48 },
        { line: "Jeder war ein großer Krieger", timestamp: 51 },
        { line: "Hielten sich für Captain Kirk", timestamp: 54 },
        { line: "Es gab ein großes Feuerwerk", timestamp: 57 },
        { line: "Die Nachbarn haben nichts gerafft", timestamp: 60 },
        { line: "Und fühlten sich gleich angemacht", timestamp: 63 },
        { line: "Dabei schoss man am Horizont", timestamp: 66 },
        { line: "Auf 99 Luftballons", timestamp: 69 },
        { line: "99 Kriegsminister", timestamp: 72 },
        { line: "Streichholz und Benzinkanister", timestamp: 75 },
        { line: "Hielten sich für schlaue Leute", timestamp: 78 },
        { line: "Witterten schon fette Beute", timestamp: 81 },
        { line: "Riefen Krieg und wollten Macht", timestamp: 84 },
        { line: "Mann, wer hätte das gedacht", timestamp: 87 },
        { line: "Dass es einmal soweit kommt", timestamp: 90 },
        { line: "Wegen 99 Luftballons", timestamp: 93 },
        { line: "Wegen 99 Luftballons", timestamp: 96 },
        { line: "99 Luftballons", timestamp: 99 },
        { line: "99 Jahre Krieg", timestamp: 102 },
        { line: "Ließen keinen Platz für Sieger", timestamp: 105 },
        { line: "Kriegsminister gibt's nicht mehr", timestamp: 108 },
        { line: "Und auch keine Düsenflieger", timestamp: 111 },
        { line: "Heute zieh' ich meine Runden", timestamp: 114 },
        { line: "Seh' die Welt in Trümmern liegen", timestamp: 117 },
        { line: "Hab' 'nen Luftballon gefunden", timestamp: 120 },
        { line: "Denk' an dich und lass' ihn fliegen", timestamp: 123 }
      ],
      german: [
        { line: "Hast du etwas Zeit für mich", timestamp: 0 },
        { line: "Dann singe ich ein Lied für dich", timestamp: 3 },
        { line: "Von 99 Luftballons", timestamp: 6 },
        { line: "Auf ihrem Weg zum Horizont", timestamp: 9 },
        { line: "Denkst du vielleicht grad' an mich", timestamp: 12 },
        { line: "Dann singe ich ein Lied für dich", timestamp: 15 },
        { line: "Von 99 Luftballons", timestamp: 18 },
        { line: "Und dass sowas von sowas kommt", timestamp: 21 },
        { line: "99 Luftballons", timestamp: 24 },
        { line: "Auf ihrem Weg zum Horizont", timestamp: 27 },
        { line: "Hielt man für Ufo's aus dem All", timestamp: 30 },
        { line: "Drum schickte ein General", timestamp: 33 },
        { line: "'ne Fliegerstaffel hinterher,", timestamp: 36 },
        { line: "Alarm zu geben, wenn's so wär'", timestamp: 39 },
        { line: "Dabei war'n dort am Horizont", timestamp: 42 },
        { line: "Nur 99 Luftballons.", timestamp: 45 },
        { line: "99 Düsenflieger", timestamp: 48 },
        { line: "Jeder war ein großer Krieger", timestamp: 51 },
        { line: "Hielten sich für Captain Kirk", timestamp: 54 },
        { line: "Es gab ein großes Feuerwerk", timestamp: 57 },
        { line: "Die Nachbarn haben nichts gerafft", timestamp: 60 },
        { line: "Und fühlten sich gleich angemacht", timestamp: 63 },
        { line: "Dabei schoss man am Horizont", timestamp: 66 },
        { line: "Auf 99 Luftballons", timestamp: 69 },
        { line: "99 Kriegsminister", timestamp: 72 },
        { line: "Streichholz und Benzinkanister", timestamp: 75 },
        { line: "Hielten sich für schlaue Leute", timestamp: 78 },
        { line: "Witterten schon fette Beute", timestamp: 81 },
        { line: "Riefen Krieg und wollten Macht", timestamp: 84 },
        { line: "Mann, wer hätte das gedacht", timestamp: 87 },
        { line: "Dass es einmal soweit kommt", timestamp: 90 },
        { line: "Wegen 99 Luftballons", timestamp: 93 },
        { line: "Wegen 99 Luftballons", timestamp: 96 },
        { line: "99 Luftballons", timestamp: 99 },
        { line: "99 Jahre Krieg", timestamp: 102 },
        { line: "Ließen keinen Platz für Sieger", timestamp: 105 },
        { line: "Kriegsminister gibt's nicht mehr", timestamp: 108 },
        { line: "Und auch keine Düsenflieger", timestamp: 111 },
        { line: "Heute zieh' ich meine Runden", timestamp: 114 },
        { line: "Seh' die Welt in Trümmern liegen", timestamp: 117 },
        { line: "Hab' 'nen Luftballon gefunden", timestamp: 120 },
        { line: "Denk' an dich und lass' ihn fliegen", timestamp: 123 }
      ]
    },
    vocabulary: ["Luftballon","Horizont","singen","Krieger","fliegen"]
  },
  {
    videoId: 'StZcUAPRRac',
    title: 'Sonne',
    artist: 'Rammstein',
    level: 'A1',
    lyrics: {
      original: [
        { line: "Eins, zwei, drei, vier, fünf, sechs, sieben, acht, neun, aus", timestamp: 0 },
        { line: "Alle warten auf das Licht", timestamp: 3 },
        { line: "Fürchtet euch, fürchtet euch nicht", timestamp: 6 },
        { line: "Die Sonne scheint mir aus den Augen", timestamp: 9 },
        { line: "sie wird heut Nacht nicht untergehen", timestamp: 12 },
        { line: "und die Welt zählt laut bis zehn", timestamp: 15 },
        { line: "Eins", timestamp: 18 },
        { line: "Hier kommt die Sonne", timestamp: 21 },
        { line: "Zwei", timestamp: 24 },
        { line: "Hier kommt die Sonne", timestamp: 27 },
        { line: "Drei", timestamp: 30 },
        { line: "Sie ist der hellste Stern von allen", timestamp: 33 },
        { line: "Vier", timestamp: 36 },
        { line: "Hier kommt die Sonne", timestamp: 39 },
        { line: "Die Sonne scheint mir aus den Händen", timestamp: 42 },
        { line: "kann verbrennen, kann euch blenden", timestamp: 45 },
        { line: "wenn sie aus den Fäusten bricht", timestamp: 48 },
        { line: "legt sich heiss auf das Gesicht", timestamp: 51 },
        { line: "sie wird heut Nacht nicht untergehen", timestamp: 54 },
        { line: "und die Welt zählt laut bis zehn", timestamp: 57 },
        { line: "Eins", timestamp: 60 },
        { line: "Hier kommt die Sonne", timestamp: 63 },
        { line: "Zwei", timestamp: 66 },
        { line: "Hier kommt die Sonne", timestamp: 69 },
        { line: "Drei", timestamp: 72 },
        { line: "Sie ist der hellste Stern von allen", timestamp: 75 },
        { line: "Vier", timestamp: 78 },
        { line: "Hier kommt die Sonne", timestamp: 81 },
        { line: "Fünf", timestamp: 84 },
        { line: "Hier kommt die Sonne", timestamp: 87 },
        { line: "Sechs", timestamp: 90 },
        { line: "Hier kommt die Sonne", timestamp: 93 },
        { line: "Sieben", timestamp: 96 },
        { line: "Sie ist der hellste Stern von allen", timestamp: 99 },
        { line: "Acht, neun", timestamp: 102 },
        { line: "Hier kommt die Sonne", timestamp: 105 },
        { line: "Die Sonne scheint mir aus den Händen", timestamp: 108 },
        { line: "kann verbrennen, kann dich blenden", timestamp: 111 },
        { line: "wenn sie aus den Fäusten bricht", timestamp: 114 },
        { line: "legt sich heiss auf dein Gesicht", timestamp: 117 },
        { line: "legt sich schmerzend auf die Brust", timestamp: 120 },
        { line: "das Gleichgewicht wird zum Verlust", timestamp: 123 },
        { line: "l ässt dich hart zu Boden gehen", timestamp: 126 },
        { line: "und die Welt zählt laut bis zehn", timestamp: 129 },
        { line: "Eins", timestamp: 132 },
        { line: "Hier kommt die Sonne", timestamp: 135 },
        { line: "Zwei", timestamp: 138 },
        { line: "Hier kommt die Sonne", timestamp: 141 },
        { line: "Drei", timestamp: 144 },
        { line: "Sie ist der hellste Stern von allen", timestamp: 147 },
        { line: "Vier", timestamp: 150 },
        { line: "Und wird nie vom Himmel fallen", timestamp: 153 },
        { line: "Fünf", timestamp: 156 },
        { line: "Hier kommt die Sonne", timestamp: 159 },
        { line: "Sechs", timestamp: 162 },
        { line: "Hier kommt die Sonne", timestamp: 165 },
        { line: "Sieben", timestamp: 168 },
        { line: "Sie ist der hellste Stern von allen", timestamp: 171 },
        { line: "Acht , neun", timestamp: 174 },
        { line: "Hier kommt die Sonne", timestamp: 177 }
      ],
      german: [
        { line: "Eins, zwei, drei, vier, fünf, sechs, sieben, acht, neun, aus", timestamp: 0 },
        { line: "Alle warten auf das Licht", timestamp: 3 },
        { line: "Fürchtet euch, fürchtet euch nicht", timestamp: 6 },
        { line: "Die Sonne scheint mir aus den Augen", timestamp: 9 },
        { line: "sie wird heut Nacht nicht untergehen", timestamp: 12 },
        { line: "und die Welt zählt laut bis zehn", timestamp: 15 },
        { line: "Eins", timestamp: 18 },
        { line: "Hier kommt die Sonne", timestamp: 21 },
        { line: "Zwei", timestamp: 24 },
        { line: "Hier kommt die Sonne", timestamp: 27 },
        { line: "Drei", timestamp: 30 },
        { line: "Sie ist der hellste Stern von allen", timestamp: 33 },
        { line: "Vier", timestamp: 36 },
        { line: "Hier kommt die Sonne", timestamp: 39 },
        { line: "Die Sonne scheint mir aus den Händen", timestamp: 42 },
        { line: "kann verbrennen, kann euch blenden", timestamp: 45 },
        { line: "wenn sie aus den Fäusten bricht", timestamp: 48 },
        { line: "legt sich heiss auf das Gesicht", timestamp: 51 },
        { line: "sie wird heut Nacht nicht untergehen", timestamp: 54 },
        { line: "und die Welt zählt laut bis zehn", timestamp: 57 },
        { line: "Eins", timestamp: 60 },
        { line: "Hier kommt die Sonne", timestamp: 63 },
        { line: "Zwei", timestamp: 66 },
        { line: "Hier kommt die Sonne", timestamp: 69 },
        { line: "Drei", timestamp: 72 },
        { line: "Sie ist der hellste Stern von allen", timestamp: 75 },
        { line: "Vier", timestamp: 78 },
        { line: "Hier kommt die Sonne", timestamp: 81 },
        { line: "Fünf", timestamp: 84 },
        { line: "Hier kommt die Sonne", timestamp: 87 },
        { line: "Sechs", timestamp: 90 },
        { line: "Hier kommt die Sonne", timestamp: 93 },
        { line: "Sieben", timestamp: 96 },
        { line: "Sie ist der hellste Stern von allen", timestamp: 99 },
        { line: "Acht, neun", timestamp: 102 },
        { line: "Hier kommt die Sonne", timestamp: 105 },
        { line: "Die Sonne scheint mir aus den Händen", timestamp: 108 },
        { line: "kann verbrennen, kann dich blenden", timestamp: 111 },
        { line: "wenn sie aus den Fäusten bricht", timestamp: 114 },
        { line: "legt sich heiss auf dein Gesicht", timestamp: 117 },
        { line: "legt sich schmerzend auf die Brust", timestamp: 120 },
        { line: "das Gleichgewicht wird zum Verlust", timestamp: 123 },
        { line: "l ässt dich hart zu Boden gehen", timestamp: 126 },
        { line: "und die Welt zählt laut bis zehn", timestamp: 129 },
        { line: "Eins", timestamp: 132 },
        { line: "Hier kommt die Sonne", timestamp: 135 },
        { line: "Zwei", timestamp: 138 },
        { line: "Hier kommt die Sonne", timestamp: 141 },
        { line: "Drei", timestamp: 144 },
        { line: "Sie ist der hellste Stern von allen", timestamp: 147 },
        { line: "Vier", timestamp: 150 },
        { line: "Und wird nie vom Himmel fallen", timestamp: 153 },
        { line: "Fünf", timestamp: 156 },
        { line: "Hier kommt die Sonne", timestamp: 159 },
        { line: "Sechs", timestamp: 162 },
        { line: "Hier kommt die Sonne", timestamp: 165 },
        { line: "Sieben", timestamp: 168 },
        { line: "Sie ist der hellste Stern von allen", timestamp: 171 },
        { line: "Acht , neun", timestamp: 174 },
        { line: "Hier kommt die Sonne", timestamp: 177 }
      ]
    },
    vocabulary: ["Sonne","Stern","hell","kommen","alle"]
  },
  {
    videoId: 'v0y6oOBZ7Mk',
    title: 'Autobahn',
    artist: 'Kraftwerk',
    level: 'A1',
    lyrics: {
      original: [
        { line: "Wir fahr'n fahr'n fahr'n auf der Autobahn", timestamp: 0 },
        { line: "Vor uns liegt ein weites Tal", timestamp: 3 },
        { line: "Die Sonne scheint mit Glitzerstrahl", timestamp: 6 },
        { line: "Die Fahrbahn ist ein graues Band", timestamp: 9 },
        { line: "Weisse Streifen, gruener Rand", timestamp: 12 },
        { line: "Jetzt schalten wir ja das Radio an", timestamp: 15 },
        { line: "Aus dem Lautsprecher klingt es dann:", timestamp: 18 },
        { line: "Wir fah'rn auf der Autobahn...", timestamp: 21 },
        { line: "[English translation:]", timestamp: 24 },
        { line: "We are driving on the Autobahn", timestamp: 27 },
        { line: "In front of us is a wide valley", timestamp: 30 },
        { line: "The sun is shining with glittering rays", timestamp: 33 },
        { line: "The driving strip is a grey track", timestamp: 36 },
        { line: "White stripes, green edge", timestamp: 39 },
        { line: "We are switching the radio on", timestamp: 42 },
        { line: "From the speaker it sounds:", timestamp: 45 },
        { line: "We are driving on the Autobahn", timestamp: 48 }
      ],
      german: [
        { line: "Wir fahr'n fahr'n fahr'n auf der Autobahn", timestamp: 0 },
        { line: "Vor uns liegt ein weites Tal", timestamp: 3 },
        { line: "Die Sonne scheint mit Glitzerstrahl", timestamp: 6 },
        { line: "Die Fahrbahn ist ein graues Band", timestamp: 9 },
        { line: "Weisse Streifen, gruener Rand", timestamp: 12 },
        { line: "Jetzt schalten wir ja das Radio an", timestamp: 15 },
        { line: "Aus dem Lautsprecher klingt es dann:", timestamp: 18 },
        { line: "Wir fah'rn auf der Autobahn...", timestamp: 21 },
        { line: "[English translation:]", timestamp: 24 },
        { line: "We are driving on the Autobahn", timestamp: 27 },
        { line: "In front of us is a wide valley", timestamp: 30 },
        { line: "The sun is shining with glittering rays", timestamp: 33 },
        { line: "The driving strip is a grey track", timestamp: 36 },
        { line: "White stripes, green edge", timestamp: 39 },
        { line: "We are switching the radio on", timestamp: 42 },
        { line: "From the speaker it sounds:", timestamp: 45 },
        { line: "We are driving on the Autobahn", timestamp: 48 }
      ]
    },
    vocabulary: ["Autobahn","fahren","vor","Tal","Sonne"]
  },
  {
    videoId: 'qdtLCfEcPL4',
    title: 'Alles Neu',
    artist: 'Peter Fox',
    level: 'B1',
    lyrics: {
      original: [
        { line: "Ich verbrenne mein Studio, schnupfe die Asche wie Koks.", timestamp: 0 },
        { line: "Ich erschlag' meinen Goldfisch, vergrab ihn im Hof.", timestamp: 3 },
        { line: "Ich jag meine Bude hoch, alles was ich hab lass ich los. (Eh...)", timestamp: 6 },
        { line: "Mein altes Leben, schmeckt wie 'n labriger Toast.", timestamp: 9 },
        { line: "Brat mir ein Prachtsteak, Peter kocht jetzt feinstes Fleisch.", timestamp: 12 },
        { line: "Bin das Update, Peter Fox 1.1", timestamp: 15 },
        { line: "Ich will abshaken, feiern, doch mein Teich ist zu klein.", timestamp: 18 },
        { line: "Mir wächst 'ne neue reihe Beißer wie bei 'nem weißen Hai. (Hou...)", timestamp: 21 },
        { line: "Gewachst , gedoped , poliert, nagelneue Zähne.", timestamp: 24 },
        { line: "Ich bin euphorisiert, und habe teure Pläne.", timestamp: 27 },
        { line: "Ich kaufe mir Baumaschinen, Bagger und Walzen und Kräne.", timestamp: 30 },
        { line: "Stürze mich auf Berlin , drück auf die Sirene.", timestamp: 33 },
        { line: "Ich baue schöne Boxentürme, Bässe massieren eure Seele.", timestamp: 36 },
        { line: "Ich bin die Abrissbirne für die d-d-d-deutsche Szene.", timestamp: 39 },
        { line: "Hey, alles glänzt, so schön neu.", timestamp: 42 },
        { line: "Hey, wenn's dir nicht gefällt, mach neu. (Hou...)", timestamp: 45 },
        { line: "Die Welt mit Staub bedeckt, doch ich will sehn wo's hingeht.", timestamp: 48 },
        { line: "Steig auf den Berg aus Dreck, weil oben frischer Wind weht.", timestamp: 51 },
        { line: "Hey, alles glänzt, so schön neu.", timestamp: 54 },
        { line: "Ich hab meine alten Sachen satt, und lass sie in 'nem Sack verrotten.", timestamp: 57 },
        { line: "Motte die Klamotten ein, und dann geh ich Nackt shoppen.", timestamp: 60 },
        { line: "Ich bin komplett renoviert, Bräute haben was zu glotzen.", timestamp: 63 },
        { line: "Kerngesund, durchtrainiert, Weltmeister im Schach und Boxen.", timestamp: 66 },
        { line: "Nur noch konkret reden, gib mir ein ja oder nein.", timestamp: 69 },
        { line: "Schluss mit Larifari, ich lass all die alten Faxen sein.", timestamp: 72 },
        { line: "Sollt' ich je wieder kiffen, hau ich mir 'ne Axt ins Bein.", timestamp: 75 },
        { line: "Ich will nie mehr Lügen, ich will jeden Satz auch so meinen.", timestamp: 78 },
        { line: "Mir platzt der Kopf, alles muss sich verändern.", timestamp: 81 },
        { line: "Ich such den Knopf , treffe die mächtigen Männer.", timestamp: 84 },
        { line: "Zwing das Land zum Glück, kaufe Banken und Sender.", timestamp: 87 },
        { line: "Alles spielt verrückt, zitternde Schafe und Lämmer.", timestamp: 90 },
        { line: "Ich seh besser aus als Bono, und bin 'n Mann des Volkes.", timestamp: 93 },
        { line: "Bereit die Welt zu retten ,auch wenn das vielleicht zu viel gewollt ist.", timestamp: 96 },
        { line: "Hey, alles glänzt, so schön neu.", timestamp: 99 },
        { line: "Hey, wenn's dir nicht gefällt, mach neu. (Hou...)", timestamp: 102 },
        { line: "Hier ist die Luft verbraucht, das Atmen fällt mir schwer.", timestamp: 105 },
        { line: "Bye Bye ich muss hier raus, die Wände kommen näher.", timestamp: 108 },
        { line: "Die Welt mit Staub bedeckt, doch ich will sehn wo's hingeht.", timestamp: 111 },
        { line: "Steig auf den Berg aus Dreck, weil oben frischer Wind weht.", timestamp: 114 },
        { line: "Hey, alles glänzt, so schön neu", timestamp: 117 }
      ],
      german: [
        { line: "Ich verbrenne mein Studio, schnupfe die Asche wie Koks.", timestamp: 0 },
        { line: "Ich erschlag' meinen Goldfisch, vergrab ihn im Hof.", timestamp: 3 },
        { line: "Ich jag meine Bude hoch, alles was ich hab lass ich los. (Eh...)", timestamp: 6 },
        { line: "Mein altes Leben, schmeckt wie 'n labriger Toast.", timestamp: 9 },
        { line: "Brat mir ein Prachtsteak, Peter kocht jetzt feinstes Fleisch.", timestamp: 12 },
        { line: "Bin das Update, Peter Fox 1.1", timestamp: 15 },
        { line: "Ich will abshaken, feiern, doch mein Teich ist zu klein.", timestamp: 18 },
        { line: "Mir wächst 'ne neue reihe Beißer wie bei 'nem weißen Hai. (Hou...)", timestamp: 21 },
        { line: "Gewachst , gedoped , poliert, nagelneue Zähne.", timestamp: 24 },
        { line: "Ich bin euphorisiert, und habe teure Pläne.", timestamp: 27 },
        { line: "Ich kaufe mir Baumaschinen, Bagger und Walzen und Kräne.", timestamp: 30 },
        { line: "Stürze mich auf Berlin , drück auf die Sirene.", timestamp: 33 },
        { line: "Ich baue schöne Boxentürme, Bässe massieren eure Seele.", timestamp: 36 },
        { line: "Ich bin die Abrissbirne für die d-d-d-deutsche Szene.", timestamp: 39 },
        { line: "Hey, alles glänzt, so schön neu.", timestamp: 42 },
        { line: "Hey, wenn's dir nicht gefällt, mach neu. (Hou...)", timestamp: 45 },
        { line: "Die Welt mit Staub bedeckt, doch ich will sehn wo's hingeht.", timestamp: 48 },
        { line: "Steig auf den Berg aus Dreck, weil oben frischer Wind weht.", timestamp: 51 },
        { line: "Hey, alles glänzt, so schön neu.", timestamp: 54 },
        { line: "Ich hab meine alten Sachen satt, und lass sie in 'nem Sack verrotten.", timestamp: 57 },
        { line: "Motte die Klamotten ein, und dann geh ich Nackt shoppen.", timestamp: 60 },
        { line: "Ich bin komplett renoviert, Bräute haben was zu glotzen.", timestamp: 63 },
        { line: "Kerngesund, durchtrainiert, Weltmeister im Schach und Boxen.", timestamp: 66 },
        { line: "Nur noch konkret reden, gib mir ein ja oder nein.", timestamp: 69 },
        { line: "Schluss mit Larifari, ich lass all die alten Faxen sein.", timestamp: 72 },
        { line: "Sollt' ich je wieder kiffen, hau ich mir 'ne Axt ins Bein.", timestamp: 75 },
        { line: "Ich will nie mehr Lügen, ich will jeden Satz auch so meinen.", timestamp: 78 },
        { line: "Mir platzt der Kopf, alles muss sich verändern.", timestamp: 81 },
        { line: "Ich such den Knopf , treffe die mächtigen Männer.", timestamp: 84 },
        { line: "Zwing das Land zum Glück, kaufe Banken und Sender.", timestamp: 87 },
        { line: "Alles spielt verrückt, zitternde Schafe und Lämmer.", timestamp: 90 },
        { line: "Ich seh besser aus als Bono, und bin 'n Mann des Volkes.", timestamp: 93 },
        { line: "Bereit die Welt zu retten ,auch wenn das vielleicht zu viel gewollt ist.", timestamp: 96 },
        { line: "Hey, alles glänzt, so schön neu.", timestamp: 99 },
        { line: "Hey, wenn's dir nicht gefällt, mach neu. (Hou...)", timestamp: 102 },
        { line: "Hier ist die Luft verbraucht, das Atmen fällt mir schwer.", timestamp: 105 },
        { line: "Bye Bye ich muss hier raus, die Wände kommen näher.", timestamp: 108 },
        { line: "Die Welt mit Staub bedeckt, doch ich will sehn wo's hingeht.", timestamp: 111 },
        { line: "Steig auf den Berg aus Dreck, weil oben frischer Wind weht.", timestamp: 114 },
        { line: "Hey, alles glänzt, so schön neu", timestamp: 117 }
      ]
    },
    vocabulary: ["verbrennen","Asche","erschlagen","vergraben","Leben"]
  },
  {
    videoId: 'hK-mYC8QQ3A',
    title: 'Easy',
    artist: 'Cro',
    level: 'A2',
    lyrics: {
      original: [
        { line: "EASY, ea ea, mh mh", timestamp: 0 },
        { line: "EASY, ea ea, mh mh", timestamp: 3 },
        { line: "Leute sagen zu mir \"Cro das Genie\",", timestamp: 6 },
        { line: "denn er flowt wieder wie", timestamp: 9 },
        { line: "dieser Hova", timestamp: 12 },
        { line: "und außerdem baut er die Beats", timestamp: 15 },
        { line: "es ist EASY, ea ea, mh mh", timestamp: 18 },
        { line: "Und dieser Typ hier vergleicht sich mit Jay-Z", timestamp: 21 },
        { line: "und scheiß auf die Playsi", timestamp: 24 },
        { line: "denn ich häng' ab mit Rockstars", timestamp: 27 },
        { line: "genauso wie AC/D EASY, ea ea, mh mh", timestamp: 30 },
        { line: "Ich chill im Bett mit ner Chic", timestamp: 33 },
        { line: "die sieht aus", timestamp: 36 },
        { line: "wie die Sis' von Beyoncé,", timestamp: 39 },
        { line: "doch eigentlich", timestamp: 42 },
        { line: "geb ich n' Fick auf Frau'n", timestamp: 45 },
        { line: "wie EASY, ea ea, mh mh", timestamp: 48 },
        { line: "Ok, das mit den Chics tut mir Leid,", timestamp: 51 },
        { line: "es war nicht so gemeint,", timestamp: 54 },
        { line: "kannst Du mir noch mal verzeihn' Ina,", timestamp: 57 },
        { line: "und Sie schreit", timestamp: 60 },
        { line: "\"Ich heiß\" EASY, ea ea, mh mh", timestamp: 63 },
        { line: "Doch wenn Sie plötzlich so kleines Ding zeigt,", timestamp: 66 },
        { line: "du eiegntlich schon weißt", timestamp: 69 },
        { line: "der zweite Strich heißt", timestamp: 72 },
        { line: "es ist aus und vorbei bleib", timestamp: 75 },
        { line: "EASY, ea ea, mh mh", timestamp: 78 },
        { line: "Und wenn Sie heiraten will", timestamp: 81 },
        { line: "und nach drei Tagen chilln", timestamp: 84 },
        { line: "schon Dein ganzes Haus und", timestamp: 87 },
        { line: "Deinen Leihwagen will", timestamp: 90 },
        { line: "ersch EASY, ea ea, mh mh", timestamp: 93 },
        { line: "Doch das würd ich mich nicht traun'", timestamp: 96 },
        { line: "man das weiß ich genau,", timestamp: 99 },
        { line: "denn davor hau ich ab", timestamp: 102 },
        { line: "und sing \"Run Away\"", timestamp: 105 },
        { line: "wie Kan-YEASY, ea ea, mh mh", timestamp: 108 },
        { line: "und dann lauf ich und lauf ich", timestamp: 111 },
        { line: "wohin ist noch offen", timestamp: 114 },
        { line: "am Besten nur weit, weit weg", timestamp: 117 },
        { line: "vielleicht Washington D EASY, ea ea, mh mh", timestamp: 120 },
        { line: "Und diese Frau war verrückt", timestamp: 123 },
        { line: "denn Sie hat mich erdrückt,", timestamp: 126 },
        { line: "Schreit \"Cro komm zurück\"", timestamp: 129 },
        { line: "doch ich schlüpf grad in die", timestamp: 132 },
        { line: "Air EASY,und verl EASY,", timestamp: 135 },
        { line: "und mach den iPod an", timestamp: 138 },
        { line: "und alles was ich hör' ist", timestamp: 141 },
        { line: "SUNNY,ah,ah,ah", timestamp: 144 },
        { line: "ich weiß schon Du heißt EASY", timestamp: 147 },
        { line: "aber ist mir egal,", timestamp: 150 },
        { line: "ich nenn dich lieber", timestamp: 153 },
        { line: "SUNNY,ah,ah,ah", timestamp: 156 },
        { line: "ab jetzt wird alles EASY", timestamp: 159 },
        { line: "denn du bist nicht mehr da", timestamp: 162 },
        { line: "SUNNY,ah,ah,ah", timestamp: 165 },
        { line: "ich weiß schon Du heißt EASY", timestamp: 168 },
        { line: "aber ist mir egal,", timestamp: 171 },
        { line: "ich nenn dich lieber", timestamp: 174 },
        { line: "SUNNY,ah,ah,ah", timestamp: 177 },
        { line: "ab jetzt wird alles EASY", timestamp: 180 },
        { line: "denn du bist nicht mehr da", timestamp: 183 },
        { line: "EASY, ea ea, mh mh", timestamp: 186 },
        { line: "EASY, ea ea, mh mh", timestamp: 189 }
      ],
      german: [
        { line: "EASY, ea ea, mh mh", timestamp: 0 },
        { line: "EASY, ea ea, mh mh", timestamp: 3 },
        { line: "Leute sagen zu mir \"Cro das Genie\",", timestamp: 6 },
        { line: "denn er flowt wieder wie", timestamp: 9 },
        { line: "dieser Hova", timestamp: 12 },
        { line: "und außerdem baut er die Beats", timestamp: 15 },
        { line: "es ist EASY, ea ea, mh mh", timestamp: 18 },
        { line: "Und dieser Typ hier vergleicht sich mit Jay-Z", timestamp: 21 },
        { line: "und scheiß auf die Playsi", timestamp: 24 },
        { line: "denn ich häng' ab mit Rockstars", timestamp: 27 },
        { line: "genauso wie AC/D EASY, ea ea, mh mh", timestamp: 30 },
        { line: "Ich chill im Bett mit ner Chic", timestamp: 33 },
        { line: "die sieht aus", timestamp: 36 },
        { line: "wie die Sis' von Beyoncé,", timestamp: 39 },
        { line: "doch eigentlich", timestamp: 42 },
        { line: "geb ich n' Fick auf Frau'n", timestamp: 45 },
        { line: "wie EASY, ea ea, mh mh", timestamp: 48 },
        { line: "Ok, das mit den Chics tut mir Leid,", timestamp: 51 },
        { line: "es war nicht so gemeint,", timestamp: 54 },
        { line: "kannst Du mir noch mal verzeihn' Ina,", timestamp: 57 },
        { line: "und Sie schreit", timestamp: 60 },
        { line: "\"Ich heiß\" EASY, ea ea, mh mh", timestamp: 63 },
        { line: "Doch wenn Sie plötzlich so kleines Ding zeigt,", timestamp: 66 },
        { line: "du eiegntlich schon weißt", timestamp: 69 },
        { line: "der zweite Strich heißt", timestamp: 72 },
        { line: "es ist aus und vorbei bleib", timestamp: 75 },
        { line: "EASY, ea ea, mh mh", timestamp: 78 },
        { line: "Und wenn Sie heiraten will", timestamp: 81 },
        { line: "und nach drei Tagen chilln", timestamp: 84 },
        { line: "schon Dein ganzes Haus und", timestamp: 87 },
        { line: "Deinen Leihwagen will", timestamp: 90 },
        { line: "ersch EASY, ea ea, mh mh", timestamp: 93 },
        { line: "Doch das würd ich mich nicht traun'", timestamp: 96 },
        { line: "man das weiß ich genau,", timestamp: 99 },
        { line: "denn davor hau ich ab", timestamp: 102 },
        { line: "und sing \"Run Away\"", timestamp: 105 },
        { line: "wie Kan-YEASY, ea ea, mh mh", timestamp: 108 },
        { line: "und dann lauf ich und lauf ich", timestamp: 111 },
        { line: "wohin ist noch offen", timestamp: 114 },
        { line: "am Besten nur weit, weit weg", timestamp: 117 },
        { line: "vielleicht Washington D EASY, ea ea, mh mh", timestamp: 120 },
        { line: "Und diese Frau war verrückt", timestamp: 123 },
        { line: "denn Sie hat mich erdrückt,", timestamp: 126 },
        { line: "Schreit \"Cro komm zurück\"", timestamp: 129 },
        { line: "doch ich schlüpf grad in die", timestamp: 132 },
        { line: "Air EASY,und verl EASY,", timestamp: 135 },
        { line: "und mach den iPod an", timestamp: 138 },
        { line: "und alles was ich hör' ist", timestamp: 141 },
        { line: "SUNNY,ah,ah,ah", timestamp: 144 },
        { line: "ich weiß schon Du heißt EASY", timestamp: 147 },
        { line: "aber ist mir egal,", timestamp: 150 },
        { line: "ich nenn dich lieber", timestamp: 153 },
        { line: "SUNNY,ah,ah,ah", timestamp: 156 },
        { line: "ab jetzt wird alles EASY", timestamp: 159 },
        { line: "denn du bist nicht mehr da", timestamp: 162 },
        { line: "SUNNY,ah,ah,ah", timestamp: 165 },
        { line: "ich weiß schon Du heißt EASY", timestamp: 168 },
        { line: "aber ist mir egal,", timestamp: 171 },
        { line: "ich nenn dich lieber", timestamp: 174 },
        { line: "SUNNY,ah,ah,ah", timestamp: 177 },
        { line: "ab jetzt wird alles EASY", timestamp: 180 },
        { line: "denn du bist nicht mehr da", timestamp: 183 },
        { line: "EASY, ea ea, mh mh", timestamp: 186 },
        { line: "EASY, ea ea, mh mh", timestamp: 189 }
      ]
    },
    vocabulary: ["Leute","sagen","wieder","außerdem","bauen"]
  }
];

/* ════════════════════════════════════════════
   INIT & YOUTUBE API LOADER
════════════════════════════════════════════ */

export function initMusic(state) {
  appState = state;
  
  // Setup Dynamic Toggles
  const toggleGermanBtn = $('toggle-german');
  if (toggleGermanBtn) {
    toggleGermanBtn.textContent = nativeLangName; // e.g., 'Español'
    // Update data attribute for logic mapping
    toggleGermanBtn.dataset.mode = 'native';
  }
  
  loadYouTubeAPI();
  renderSuggestions();
  bindMusicEvents();
}

function loadYouTubeAPI() {
  if (window.YT && window.YT.Player) return;
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// Called automatically by YT API when ready
window.onYouTubeIframeAPIReady = function() {
  ytPlayer = new window.YT.Player('yt-player', {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 1,
      modestbranding: 1,
      rel: 0
    },
    events: {
      'onStateChange': onPlayerStateChange
    }
  });
};

/* ════════════════════════════════════════════
   SUGGESTIONS RENDERING
════════════════════════════════════════════ */

function renderSuggestions() {
  const container = $('yt-suggestions');
  if (!container) return;

  container.innerHTML = YT_SUGGESTIONS.map(song => `
    <div class="yt-suggestion-card" data-video-id="${song.videoId}" role="button" tabindex="0" aria-label="Play ${song.title} by ${song.artist}">
      <div class="yt-suggestion-card__meta">
        <span class="yt-suggestion-card__title">${song.title}</span>
        <span class="yt-suggestion-card__artist">${song.artist}</span>
      </div>
      <span class="yt-suggestion-card__level yt-suggestion-card__level--${song.level}">${song.level}</span>
    </div>
  `).join('');

  container.querySelectorAll('.yt-suggestion-card').forEach(card => {
    card.addEventListener('click', () => {
      loadSong(card.dataset.videoId);
    });
  });
}

/* ════════════════════════════════════════════
   LOAD SONG & SYNC
════════════════════════════════════════════ */

function extractVideoId(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? match[1] : null;
}

function loadSong(videoIdOrUrl) {
  const videoId = extractVideoId(videoIdOrUrl) || videoIdOrUrl;
  const errorMsg = $('yt-error-msg');
  if (errorMsg) errorMsg.classList.add('hidden');

  if (!videoId || videoId.length !== 11) {
    if (errorMsg) {
      errorMsg.textContent = 'Invalid YouTube link. Please check the URL.';
      errorMsg.classList.remove('hidden');
    }
    return;
  }

  // Check if it's a known suggestion (Option B logic)
  const knownSong = YT_SUGGESTIONS.find(s => s.videoId === videoId);
  
  if (!knownSong) {
    // Arbitrary public video
    if (errorMsg) {
      errorMsg.textContent = 'No German subtitles found for this video. Try another song or use a recommended one.';
      errorMsg.classList.remove('hidden');
    }
    return;
  }

  openPlayer(knownSong);
}

function onPlayerStateChange(event) {
  if (event.data === window.YT.PlayerState.PLAYING) {
    startSync();
  } else {
    stopSync();
  }
}

function startSync() {
  // Sync logic is disabled since we are displaying full static lyrics 
  // without precise timestamps for the time being.
}

function stopSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

function syncLyricsToTime(time) {
  if (!currentSong) return;
  const lines = currentSong.lyrics.german;
  let activeIndex = -1;

  // Find the last line whose timestamp is <= current time
  for (let i = 0; i < lines.length; i++) {
    if (time >= lines[i].timestamp) {
      activeIndex = i;
    } else {
      break;
    }
  }

  if (activeIndex !== currentActiveLineIndex) {
    // Remove old highlights
    document.querySelectorAll('.lyric-line--active, .lyric-pair--active').forEach(el => {
      el.classList.remove('lyric-line--active', 'lyric-pair--active');
    });

    if (activeIndex >= 0) {
      const lineEls = document.querySelectorAll(`[data-index="${activeIndex}"]`);
      lineEls.forEach(el => {
        if (el.classList.contains('lyric-pair')) el.classList.add('lyric-pair--active');
        else el.classList.add('lyric-line--active');
        
        // Only scroll if we changed lines to avoid jitter
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
    currentActiveLineIndex = activeIndex;
  }
}

/* ════════════════════════════════════════════
   PLAYER UI
════════════════════════════════════════════ */

function openPlayer(song) {
  currentSong = song;
  currentMode = 'original';
  quizActive  = false;
  currentActiveLineIndex = -1;

  // Populate header
  const titleEl  = $('player-song-title');
  const artistEl = $('player-song-artist');
  const badgeEl  = $('player-level-badge');
  if (titleEl)  titleEl.textContent  = song.title;
  if (artistEl) artistEl.textContent = song.artist;
  if (badgeEl) {
    badgeEl.textContent = song.level;
    badgeEl.className   = `music-player__level-badge music-player__level-badge--${song.level}`;
  }

  // Load video into iframe
  if (ytPlayer && ytPlayer.loadVideoById) {
    ytPlayer.loadVideoById(song.videoId);
  }

  // Reset toggles
  setToggleMode('original');

  // Render lyrics
  renderLyrics(song, currentMode);

  // Hide input section, show player
  $('yt-section')?.classList.add('hidden');
  $('music-quiz')?.classList.add('hidden');
  $('music-player')?.classList.remove('hidden');
}

function closePlayer() {
  stopSync();
  if (ytPlayer && ytPlayer.stopVideo) {
    ytPlayer.stopVideo();
  }
  currentSong = null;
  $('music-player')?.classList.add('hidden');
  $('yt-section')?.classList.remove('hidden');
}

/* ════════════════════════════════════════════
   DYNAMIC TRANSLATION
════════════════════════════════════════════ */

async function translateLyricsChunk(linesText, targetLang) {
  // Use public Google Translate endpoint
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=de&tl=${targetLang}&dt=t&q=${encodeURIComponent(linesText)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    // data[0] contains array of translated sentences
    return data[0].map(item => item[0]).join('');
  } catch(e) {
    console.error("Translation error:", e);
    return linesText; // fallback to original
  }
}

async function getNativeLyrics(song) {
  if (song.lyrics.native) return song.lyrics.native;
  
  $('music-lyrics').classList.add('hidden');
  $('music-lyrics-loading')?.classList.remove('hidden');
  
  // We need to translate line by line, but to avoid 50 API calls, we join them
  // with newlines and translate in one go.
  const originalLines = song.lyrics.original.map(l => l.line);
  const textToTranslate = originalLines.join('\n');
  
  const translatedText = await translateLyricsChunk(textToTranslate, userLangCode);
  const translatedLines = translatedText.split('\n');
  
  // Cache it
  song.lyrics.native = song.lyrics.original.map((l, i) => ({
    line: translatedLines[i] || l.line,
    timestamp: l.timestamp
  }));
  
  $('music-lyrics-loading')?.classList.add('hidden');
  $('music-lyrics').classList.remove('hidden');
  
  return song.lyrics.native;
}

async function renderLyrics(song, mode) {
  const lyricsEl = $('music-lyrics');
  if (!lyricsEl) return;

  let nativeLines = null;
  if (mode === 'native' || mode === 'bilingual') {
    nativeLines = await getNativeLyrics(song);
    // If the user changed modes while fetching, abort render
    if (currentSong !== song || currentMode !== mode) return;
  }

  const lines = mode === 'bilingual'
    ? song.lyrics.original.map((l, i) => ({
        original: l.line,
        german: nativeLines[i]?.line || l.line, // Actually this is 'native' now
      }))
    : (mode === 'native' ? nativeLines : song.lyrics.original);

  if (mode === 'bilingual') {
    lyricsEl.innerHTML = lines.map((pair, i) => `
      <div class="lyric-pair" data-index="${i}">
        <p class="lyric-line lyric-line--original">${renderClickableWords(pair.original)}</p>
        <p class="lyric-line lyric-line--german">${pair.german}</p>
      </div>
    `).join('');
  } else {
    const isOriginal = mode === 'original';
    lyricsEl.innerHTML = lines.map((l, i) => `
      <p class="lyric-line${!isOriginal ? ' lyric-line--german' : ''}" data-index="${i}">
        ${isOriginal ? renderClickableWords(l.line) : escapeHtml(l.line)}
      </p>
    `).join('');
  }

  // Bind word click events on Original (German) lines
  lyricsEl.querySelectorAll('.lyric-word').forEach(word => {
    word.addEventListener('click', () => showWordPopup(word.dataset.word));
  });
}

function renderClickableWords(text) {
  return text.split(' ').map(w => {
    const clean = w.replace(/[^a-zA-ZäöüßÄÖÜ]/g, '');
    if (clean.length > 2) {
      return `<span class="lyric-word" data-word="${clean}">${w}</span>`;
    }
    return w;
  }).join(' ');
}

/* ════════════════════════════════════════════
   WORD LOOKUP POPUP
════════════════════════════════════════════ */

async function showWordPopup(word) {
  const popup = $('music-word-popup');
  if (!popup) return;

  const popupWord    = $('popup-word');
  const popupArticle = $('popup-article');
  const popupMeaning = $('popup-meaning');
  const popupLevel   = $('popup-level');
  
  // Quick reset
  if (popupWord) popupWord.textContent = word;
  if (popupArticle) popupArticle.textContent = '';
  if (popupMeaning) popupMeaning.textContent = 'Translating...';
  if (popupLevel) popupLevel.textContent = '';
  
  popup.classList.remove('hidden');

  try {
    const data = await lookupWord(word);
    if (!data || data.error) throw new Error(data?.error || 'Not found');
    
    if (popupWord) popupWord.textContent = data.word || word;
    if (popupArticle) popupArticle.textContent = data.article ? `${data.article} ` : '';
    if (popupMeaning) popupMeaning.textContent = data.translation || data.meaning;
    if (popupLevel && data.level) {
      popupLevel.textContent = data.level;
      popupLevel.className = `music-word-popup__level music-word-popup__level--${data.level}`;
    }
  } catch (err) {
    if (popupMeaning) popupMeaning.textContent = 'Translation not available.';
  }
}

/* ════════════════════════════════════════════
   QUIZ
════════════════════════════════════════════ */

function startQuiz() {
  if (!currentSong) return;
  quizActive = true;
  quizIndex  = 0;
  quizWords  = shuffle([...(currentSong.vocabulary || [])]).slice(0, 5);

  if (quizWords.length < 3) {
    alert("Not enough vocabulary words to generate a quiz.");
    quizActive = false;
    return;
  }

  $('music-lyrics')?.classList.add('hidden');
  $('music-quiz')?.classList.remove('hidden');
  
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const container = $('music-quiz');
  if (!container) return;

  if (quizIndex >= quizWords.length) {
    // End of quiz
    container.innerHTML = `
      <div class="music-quiz__complete">
        <h3>🎉 Quiz Complete!</h3>
        <p>You practiced ${quizWords.length} words from this song.</p>
        <button id="quiz-done-btn" class="btn-primary" style="margin-top: 16px;">Back to Lyrics</button>
      </div>
    `;
    $('quiz-done-btn')?.addEventListener('click', () => {
      quizActive = false;
      $('music-quiz')?.classList.add('hidden');
      $('music-lyrics')?.classList.remove('hidden');
    });
    return;
  }

  const targetWord = quizWords[quizIndex];
  
  // Generate options (1 correct, 3 random wrong from the rest of the vocab)
  const pool = (currentSong.vocabulary || []).filter(w => w !== targetWord);
  const wrongOptions = shuffle(pool).slice(0, 3);
  const options = shuffle([targetWord, ...wrongOptions]);

  container.innerHTML = `
    <div class="music-quiz__header">
      <p class="music-quiz__progress">Question ${quizIndex + 1} of ${quizWords.length}</p>
      <h3 class="music-quiz__question">What does this word mean?</h3>
      <div class="music-quiz__target">${targetWord}</div>
    </div>
    <div class="music-quiz__options">
      ${options.map(opt => `<button class="quiz-option" data-word="${opt}">Translating ${opt}...</button>`).join('')}
    </div>
    <div id="quiz-result" class="music-quiz__result hidden"></div>
  `;

  // Fetch meanings for buttons asynchronously to mock the translation UI
  const btns = container.querySelectorAll('.quiz-option');
  btns.forEach(async btn => {
    const word = btn.dataset.word;
    try {
      const data = await lookupWord(word);
      btn.textContent = data.translation || word;
    } catch {
      btn.textContent = word; // fallback
    }
    btn.addEventListener('click', () => handleQuizAnswer(btn, targetWord));
  });
}

function handleQuizAnswer(btn, correctWord) {
  const isCorrect = btn.dataset.word === correctWord;

  // Disable all options
  document.querySelectorAll('.quiz-option').forEach(b => {
    b.disabled = true;
    if (b.dataset.word === correctWord) b.classList.add('quiz-option--correct');
    else if (b === btn && !isCorrect)    b.classList.add('quiz-option--wrong');
  });

  const resultEl = $('quiz-result');
  if (resultEl) {
    resultEl.textContent  = isCorrect ? '✅ Correct!' : `❌ The answer was: ${correctWord}`;
    resultEl.className    = `music-quiz__result ${isCorrect ? 'music-quiz__result--correct' : 'music-quiz__result--wrong'}`;
    resultEl.classList.remove('hidden');
  }

  setTimeout(() => {
    quizIndex++;
    renderQuizQuestion();
  }, 1500);
}

/* ════════════════════════════════════════════
   TOGGLE MODE
════════════════════════════════════════════ */

function setToggleMode(mode) {
  currentMode = mode;
  ['original', 'native', 'bilingual'].forEach(m => {
    const btn = $(`toggle-${m === 'native' ? 'german' : m}`); // ID is still toggle-german
    if (btn) btn.setAttribute('aria-pressed', String(m === mode));
    btn?.classList.toggle('active', m === mode);
  });
  if (currentSong) {
    renderLyrics(currentSong, mode);
  }
}

/* ════════════════════════════════════════════
   EVENTS
════════════════════════════════════════════ */

function bindMusicEvents() {
  // YT Link Loader
  $('yt-load-btn')?.addEventListener('click', () => {
    const val = $('yt-link-input')?.value;
    if (val) loadSong(val);
  });

  // Player back button
  $('music-player-back')?.addEventListener('click', closePlayer);

  // Toggle buttons
  ['original', 'native', 'bilingual'].forEach(mode => {
    $(`toggle-${mode === 'native' ? 'german' : mode}`)?.addEventListener('click', () => setToggleMode(mode));
  });

  // Word popup close
  $('popup-close')?.addEventListener('click', () => {
    $('music-word-popup')?.classList.add('hidden');
  });

  // Word popup listen (speak)
  $('popup-listen')?.addEventListener('click', () => {
    const word = $('popup-word')?.textContent;
    if (word) speak(word);
  });

  // Quiz button
  $('music-quiz-btn')?.addEventListener('click', () => {
    if (quizActive) {
      quizActive = false;
      $('music-quiz')?.classList.add('hidden');
      $('music-lyrics')?.classList.remove('hidden');
    } else {
      startQuiz();
    }
  });
  
  // Hide the old Pronounce button since YouTube provides the audio
  const pronounceBtn = $('music-pronounce-btn');
  if (pronounceBtn) {
    pronounceBtn.style.display = 'none';
  }
}

/* ════════════════════════════════════════════
   UTILS
════════════════════════════════════════════ */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}
