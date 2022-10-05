import fetch from 'node-fetch';

const URL = "http://srvprobepr01.gentgrp.gent.be";

const REGLEMENTEN = `
PREFIX eli: <http://data.europa.eu/eli/ontology#>
PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>


SELECT ?besluit ?title ?date WHERE {
  ?besluit a besluit:Besluit ;
    eli:date_publication ?date ;
    eli:title_short ?title .
} ORDER BY DESC(?date) LIMIT 5`;

async function query() {
    const endpoint = URL + "/sparql?query=" + encodeURIComponent(REGLEMENTEN);
    const response = await fetch(endpoint,
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/sparql-results+json'
            }
        });

    if (response.ok) {
        const json = await response.json();
        console.log(JSON.stringify(json.results.bindings));
    } else {
        console.log("Error when getting data.");
    }
}

query();