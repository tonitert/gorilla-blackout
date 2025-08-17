import type { Component } from "svelte"
import Haaste from "./elements/haaste.svelte"
import Text from "./elements/text.svelte"
import RajuPyora from "./elements/rajuPyora.svelte"
import type { ElementProps } from "./elements/elementProps"

export interface Tile<T extends object> {
    message?: string
    customElement?: Component<ElementProps & T>
    props?: T
    customWait?: boolean
}

const tileTypes = {
    haaste: {
        message: "Haaste",
        customElement: Haaste
    },
    juo2: {
        message: "Juo 2 huikkaa"
    },
    juo5: {
        message: "Juo 5 huikkaa"
    }
}

export const tiles: {[key: number]: Tile<any>} = {
    1: tileTypes.juo5,
    2: tileTypes.juo2,
    3: {
        message: "Kaikki juo 2 huikkaa!"
    },
    4: {
        message: "Keksi peliin sääntö!"
    },
    5: {
        message: "Ota shotti!"
    },
    6: {
        message: "Juo 2 huikkaa!"
    },
    7: {
        
    },
    8: tileTypes.haaste,
    9: {
        message: "Juo 2 huikkaa!"
    },
    10: {
        message: "Vesiputous",
        customElement: Text,
        props: {
            text: "Kaikki pelaajat aloittavat juomisen samaan aikaan. Kun lopetat, seuraava pelaaja saa lopettaa, sitten seuraava ja niin edelleen."
        }
    },
    11: {
        message: "Juo 3 huikkaa!"
    },
    12: {
        message: "Kaikki juo 2 huikkaa!"
    },
    13: {
        message: "Nopanheitto takaisin"
    },
    14: {
        customElement: RajuPyora
    },
    15: {
        message: "Jaa 3 huikkaa!"
    },
    16: {
        message: "Ota 3 huikkaa!"
    },
    17: {
        message: "Välivesi"
    },
    18: {
        message: "Ryhmäshotti",
        customElement: Text,
        props: {
            text: "Kaikki ottavat shotin"
        }
    },
    19: {
        message: "Ota 3 huikkaa1"
    },
    20: {
        message: "Ota 4 huikkaa!"
    },
    21: {
        message: "Safe"
    },
    22: {

    }

}