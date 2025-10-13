import type { Component } from "svelte"
import Haaste from "./elements/Haaste.svelte"
import Text from "./elements/text.svelte"
import RajuPyora from "./elements/RajuPyora.svelte"
import KPS from "./elements/KPS.svelte"
import type { ElementProps } from "./elements/elementProps"
import DiceRollBack from "./elements/DiceRollBack.svelte"
import Dices35Back from "./elements/Dices35Back.svelte"
import SixToPass from "./elements/SixToPass.svelte"
import { tileImages } from "../tileImages";

export interface Tile<T extends object, Y extends object> {
    image?: string
    message?: string
    customElement?: Component<ElementProps & T, {onActionButtonClick?: () => void}>
    props?: T
    moveStartMessage?: string
    moveStartElement?: Component<ElementProps & Y, {onActionButtonClick?: () => void}>
    moveStartProps?: Y
    customWait?: boolean
    unskippable?: boolean
}

const tileTypes: {[key: string]: Tile<any, any>} = {
    challenge: {
        image: tileImages.haaste,
        message: "Haaste!",
        customElement: Haaste
    },
    drink2: {
        image: tileImages.kaksihuikkaa,
        message: "Juo 2 huikkaa!"
    },
    drink3: {
        image: tileImages.kolmehuikkaa,
        message: "Juo 3 huikkaa!"
    },
    drink4: {
        image: tileImages.neljahuikkaa,
        message: "Juo 4 huikkaa!"
    },
    paskaHeitto: {
        image: tileImages.paskaHeitto,
        message: "Juo 5 huikkaa!"
    },
    drink5: {
        image: tileImages.viisiHuikkaa,
        message: "Juo 5 huikkaa!"
    },
    give3: {
        image: tileImages.jaa3,
        message: "Jaa 3 huikkaa!",
    },
    give6: {
        image: tileImages.jaa6,
        message: "Jaa 6 huikkaa!",
    },
    give9: {
        image: tileImages.jaa9,
        message: "Jaa 9 huikkaa!",
    },
    mostDrunkDrinks3: {
        image: tileImages.enitenSuba,
        message: "Eniten kännissä juo 3 huikkaa!"
    },
    leastDrunkDrinks5: {
        image: tileImages.vahitenSuba,
        message: "Vähiten kännissä juo 5 huikkaa!"
    },
    everyoneDrinks2: {
        image: tileImages.kaikkiJuo2,
        message: "Kaikki juo 2 huikkaa!"
    },
    everyoneDrinks3ExceptYou: {
        image: tileImages.kaikkiJuo3,
        message: "Kaikki juo 3 huikkaa, paitsi sinä!"
    },
    onetwothree: {
        image: tileImages.yksikaksikolme,
        message: "1, 2, 3",
        customElement: Text,
        props: {
            text: "Juo 1 huikka. Seuraava pelaaja juo 2, sitä seuraava 3 ja niin edelleen."
        }
    },
    shutup: {
        image: tileImages.turpaHiljaa,
        message: "Ole hiljaa 5 minuuttia!"
    },
    safe: {
        image: tileImages.safe,
        message: "Safe!",
        customElement: Text,
        props: {
            text: "Tässä ruudussa ei tarvitse juoda."
        }
    },
    shot: {
        image: tileImages.shotti,
        message: "Ota shotti!"
    },
    waterfall: {
        image: tileImages.vesiputous,
        message: "Vesiputous",
        customElement: Text,
        props: {
            text: "Kaikki pelaajat aloittavat juomisen samaan aikaan. Kun lopetat, seuraava pelaaja saa lopettaa, sitten seuraava ja niin edelleen."
        }
    },
    wheel: {
        customElement: RajuPyora
    },
    water: {
        image: tileImages.valivesi,
        message: "Välivesi"
    },
    groupShot: {
        image: tileImages.ryhmashotti,
        message: "Ryhmäshotti",
        customElement: Text,
        props: {
            text: "Kaikki ottavat shotin!"
        }
    },
    leftDrinks3: {
        image: tileImages.vasenSipuli,
        message: "Vasen kaveri juo 3 huikkaa!"
    },
    rightDrinks3: {
        image: tileImages.oikeaMies,
        message: "Oikea kaveri juo 3 huikkaa!"
    },
    dieRollBack: {
        image: tileImages.noppa,
        message: "Nopanheitto takaisin!",
        customElement: DiceRollBack
    },
    dieRollBackx2: {
        image: tileImages.noppaX2,
        message: "Nopanheitto takaisin tuplana!",
        customElement: DiceRollBack,
        props: {
            multiplier: 2
        }
    },
    rockPaperScissorsShot: {
        image: tileImages.kps,
        customElement: KPS,
        unskippable: true
    },
    rule: {
        image: tileImages.saanto,
        message: "Keksi peliin sääntö! Sääntö on voimassa kunnes joku keksii uuden. Säännön rikkomisesta tulee viiden huikan sakko.",
    },
    dices35back: {
        image: tileImages.kolmekymmentaviisitaakse,
        message: "Heitä kahta noppaa. Kun silmälukujen summa on 11 tai 12, liiku 35 taakse!",
        customElement: Dices35Back,
        moveStartMessage: "Heitä kahta noppaa. Kun silmälukujen summa on 11 tai 12, liiku 35 taakse!",
        moveStartElement: Dices35Back
    },
    sixToWin: {
        image: tileImages.noppaMaali,
        message: "Heitä noppaa. Saadessasi 6 voitat pelin!",
        unskippable: true,
        customElement: SixToPass
    },
    win: {
        message: "Voitit pelin!",
        customElement: Text,
        props: {
            text: "Muut pelaajat voivat vielä halutessaan jatkaa pelaamista."
        },
        unskippable: true
    }
}

export const tiles: {[key: number]: Tile<any, any>} = {
    1: tileTypes.paskaHeitto,
    2: tileTypes.drink2,
    3: tileTypes.everyoneDrinks2,
    4: tileTypes.rule,
    5: tileTypes.shot,
    6: tileTypes.drink2,
    7: tileTypes.safe,
    8: tileTypes.challenge,
    9: tileTypes.drink2,
    10: tileTypes.waterfall,
    11: tileTypes.drink3,
    12: tileTypes.everyoneDrinks2,
    13: tileTypes.dieRollBack,
    14: tileTypes.wheel,
    15: tileTypes.give3,
    16: tileTypes.drink3,
    17: tileTypes.water,
    18: tileTypes.groupShot,
    19: tileTypes.drink3,
    20: tileTypes.drink4,
    21: tileTypes.safe,
    22: tileTypes.challenge,
    23: tileTypes.waterfall,
    24: tileTypes.drink4,
    25: tileTypes.water,
    26: tileTypes.drink4,
    27: tileTypes.leftDrinks3,
    28: tileTypes.give6,
    29: tileTypes.dieRollBackx2,
    30: tileTypes.water,
    31: tileTypes.drink4,
    32: tileTypes.rockPaperScissorsShot,
    33: tileTypes.safe,
    34: tileTypes.shot,
    35: tileTypes.drink4,
    36: tileTypes.mostDrunkDrinks3,
    37: tileTypes.rule,
    38: tileTypes.wheel,
    39: tileTypes.shutup,
    40: tileTypes.drink5,
    41: tileTypes.water,
    42: tileTypes.rightDrinks3,
    43: tileTypes.dieRollBack,
    44: tileTypes.give9,
    45: tileTypes.leastDrunkDrinks5,
    46: tileTypes.drink5,
    47: tileTypes.safe,
    48: tileTypes.onetwothree,
    49: tileTypes.drink5,
    50: tileTypes.everyoneDrinks3ExceptYou,
    51: tileTypes.water,
    52: tileTypes.waterfall,
    53: tileTypes.dices35back,
    54: tileTypes.sixToWin,
    55: tileTypes.win
}