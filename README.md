# Luna da casa

Pagina statica pronta per GitHub Pages. Genera una card PNG della Luna per Frattaminore (coordinate modificabili) con fase, illuminazione, distanza, diametro apparente, età, prossime luna nuova/piena, altezza e azimut.

## Cosa cambia rispetto a `luna_casa.py`

Il programma Python richiamava `lunardelight/moon.py` e selezionava una delle 707 immagini NASA locali. Questa versione conserva lo stesso dataset in `assets/nasa/`, usa [SunCalc](https://github.com/mourner/suncalc) per le effemeridi nel browser, seleziona il frame NASA più vicino alla fase calcolata e lo ruota per la posizione locale. Il disco mostrato e scaricato è quindi una vera immagine NASA della Luna, non un disegno procedurale.

La data/ora inserita è interpretata come ora locale del browser; il fuso scelto serve alla visualizzazione nella card. Per l'istante assoluto più preciso quando si imposta un fuso diverso da quello del dispositivo, aprire la pagina con il browser già impostato su quel fuso o usare la data corrente. Distanza, posizione e illuminazione sono calcolate localmente senza inviare coordinate a un server.

## Pubblicazione su GitHub Pages

1. Crea un repository GitHub e carica **tutta** la cartella del progetto, incluso `assets/` (contiene i 707 frame NASA), nella radice.
2. In **Settings → Pages**, scegli **Deploy from a branch**, poi `main` e la cartella `/ (root)`.
3. Salva e apri l'URL pubblicato indicato da GitHub.

Il repository contiene circa 883 MB di asset NASA: è la controparte necessaria per mantenere fedeltà fotografica e funzionamento statico/offline. La sola dipendenza esterna è il modulo SunCalc caricato da jsDelivr. Per un sito completamente offline, scarica il pacchetto SunCalc, salvalo nel repository e sostituisci l'URL dell'import all'inizio di `app.js` con il percorso locale.

Puoi aprire `index.html` anche con doppio clic. Per GitHub Pages carica l'intera cartella senza rinominare o omettere `assets/`.
