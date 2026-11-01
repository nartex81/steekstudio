# Steekstudio

Een Nederlandstalige browsertool die afbeeldingen omzet naar bewerkbare kruissteekpatronen. Alle beeldverwerking gebeurt lokaal in je browser. Geen installatie, account, backend of externe runtimebibliotheken nodig.

## Aan de slag

Gebruik Steekstudio direct op **[nartex81.github.io/steekstudio](https://nartex81.github.io/steekstudio/)**. Aanmelden is niet nodig; je afbeeldingen blijven in je eigen browser.

Download deze repository en open **dist/index.html** in een moderne browser. Je kunt ook de map **dist** op een statische webhost plaatsen.

1. Laad een PNG-, JPG- of WebP-afbeelding op (maximaal 20 MB).
2. Snijd tekst, randen en borduurringen weg.
3. Kies 20–200 steken breed en 2–24 kleuren en maak je patroon.
4. Werk vakjes bij met potlood, gum of pipet en wijzig tinten via de kleurenlijst.
5. Sla het project op of exporteer het patroon met kleurenlegenda.

## Mogelijkheden

- Kleuren, letters als symbolen en een steekjesweergave.
- Verbonden lichte achtergrond verwijderen en losse kleurpuntjes verminderen.
- Afmetingen voor 11, 14, 16 of 18 count Aida.
- Tekenen, wissen, kleuren kiezen, zoomen en ongedaan maken.
- Hele kruissteek (×) of halve steek in beide richtingen (/ en \). Kies **Steek** bij het potlood. De keuze geldt ook voor alle steken wanneer je opnieuw genereert. Halve steken blijven behouden bij opslaan, heropenen en exporteren naar SVG, PNG en PDF.
- De legenda telt hele en halve steken apart. Oudere projecten worden als hele steken ingelezen.
- Fotoverbetering met regelaars voor textuur, schaduw en achtergrondtolerantie. Kies de achtergrondkleur in de originele uitsnede of met de kleurenkiezer.
- Origineel en live patroonvoorbeeld naast elkaar. Instellingen veranderen alleen het voorbeeld; **Voorbeeld toepassen** vervangt het patroon en de voortgang.
- Benaderende DMC-nummers bij alle kleuren en in de export. De optie **Gebruik benaderende DMC-tinten** zet nieuwe patronen om naar de bijbehorende schermtinten en combineert dubbele matches.
- Verbonden vlakken vullen of wissen, kleuren samenvoegen en kleine kleur-eilandjes opruimen. **Ongedaan** herstelt ook de voortgang.
- Afgewerkte steken afvinken door te klikken of slepen, of een hele kleur afvinken. De voortgang blijft lokaal en in projectbestanden bewaard. Optioneel kun je vinkjes mee exporteren.
- Projecten als JSON opslaan en opnieuw openen; het laatste patroon wordt lokaal onthouden.
- SVG en PNG met raster, legenda en aantallen.
- Afdrukken of bewaren als PDF via het browservenster, met A4-patroonbladen van maximaal 40 × 50 steken.
- Toetsenbord: pijltjes kiezen een vakje, spatie tekent en Delete wist.

## Grenzen

Foto-omzetting is een benadering, geen reconstructie van het oorspronkelijke telpatroon. De fotoverbetering gebruikt lokale filters; stofstructuur, schaduw en bestaande rasterlijnen kunnen nog ongewenste kleuren opleveren. Controleer het patroon en bewerk het waar nodig. DMC-nummers zijn **benaderende matches**, geen garantie voor een gelijke fysieke garenkleur. De stofmaat geldt zonder extra stofrand. Kleine kleur-eilandjes opruimen kan ook ogen of andere details verwijderen; gebruik zo nodig Ongedaan.

Nieuwe projectbestanden bevatten het patroon, de steektypes, de voortgang en een verkleinde bronafbeelding (maximaal 640 pixels per zijde) met uitsnede. Oude v1- en v2-projecten worden automatisch ingelezen; ze bevatten geen bronafbeelding. De bewerkbare steken blijven behouden. Opnieuw toepassen gebruikt de huidige bron en vervangt handmatige aanpassingen, voortgang en undo-geschiedenis. Sla je project eerst op om die versie te bewaren. Instellingen voor het live voorbeeld worden bij heropenen op de standaardwaarden gezet; het opgeslagen patroon wordt daardoor niet gewijzigd.

Gebruik **Project opslaan** voor een back-up of om op een ander apparaat verder te gaan. Automatische lokale opslag hoort bij deze browser en dit websiteadres; er is geen cloudsynchronisatie.

Gebruik beelden waarvoor je toestemming hebt. De drie meegeleverde SVG-voorbeelden zijn originele, eenvoudige vectorontwerpen en vallen onder dezelfde MIT-licentie als de code. Door de gebruiker aangeleverde afbeeldingen zijn niet opgenomen.

## Controle

Met Node.js: `node check.cjs`. De check controleert fotoverbetering, achtergrondverwijdering, DMC-matching, vlakvulling, kleurmerging, opruimen, oude projecten, voortgang, halve steken, ongedaan maken en SVG-/afdrukexport.

## Achtergrond en licentie

Het idee is geïnspireerd door [Embroiderly](https://github.com/embroidery-space/embroiderly). Deze browsertool is zelfstandig geschreven; er is geen broncode of beeldmateriaal uit dat project overgenomen.

De broncode en meegeleverde vectorvoorbeelden zijn beschikbaar onder de [MIT-licentie](LICENSE). Kleurgegevens: craft-color-codes by [MakeBead](https://makebead.com/), onder CC BY 4.0. Zie [THIRD-PARTY.md](THIRD-PARTY.md) voor bron, licentie en aanpassingen.
