# Steekstudio

Een Nederlandstalige browsertool die afbeeldingen omzet naar bewerkbare kruissteekpatronen. Alle beeldverwerking gebeurt lokaal in je browser. Geen installatie, account, backend of externe runtimebibliotheken nodig.

## Aan de slag

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
- Projecten als JSON opslaan en opnieuw openen; het laatste patroon wordt lokaal onthouden.
- SVG en PNG met raster, legenda en aantallen.
- Afdrukken of bewaren als PDF via het browservenster, met A4-patroonbladen van maximaal 40 × 50 steken.
- Toetsenbord: pijltjes kiezen een vakje, spatie tekent en Delete wist.

## Grenzen

Foto-omzetting is een benadering, geen reconstructie van het oorspronkelijke telpatroon. Stofstructuur, schaduw en bestaande rasterlijnen kunnen ongewenste kleuren opleveren. Controleer het patroon en bewerk het waar nodig. Kleuren zijn afgeleid van de afbeelding en zijn **geen DMC-codes**. De stofmaat geldt zonder extra stofrand.

Een projectbestand bevat het patroon, maar niet de bronafbeelding. Opnieuw genereren gebruikt de huidige bron en vervangt handmatige aanpassingen en de undo-geschiedenis. Sla je project eerst op om die versie te bewaren.

Gebruik beelden waarvoor je toestemming hebt. De drie meegeleverde SVG-voorbeelden zijn originele, eenvoudige vectorontwerpen en vallen onder dezelfde MIT-licentie als de code. Door de gebruiker aangeleverde afbeeldingen zijn niet opgenomen.

## Controle

Met Node.js: `node check.cjs`. De check controleert kleurvereenvoudiging, achtergrondverwijdering, ingesloten witte details en validatie van projectbestanden.

## Achtergrond en licentie

Het idee is geïnspireerd door [Embroiderly](https://github.com/embroidery-space/embroiderly). Deze browsertool is zelfstandig geschreven; er is geen broncode of beeldmateriaal uit dat project overgenomen.

De broncode en meegeleverde vectorvoorbeelden zijn beschikbaar onder de [MIT-licentie](LICENSE).
