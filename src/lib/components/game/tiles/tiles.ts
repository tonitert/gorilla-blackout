import type { Component } from 'svelte';
import Haaste from './elements/Haaste.svelte';
import Text from './elements/text.svelte';
import RajuPyora from './elements/RajuPyora.svelte';
import KPS from './elements/KPS.svelte';
import type { ElementProps } from './elements/elementProps';
import DiceRollBack from './elements/DiceRollBack.svelte';
import Dices35Back from './elements/Dices35Back.svelte';
import SixToPass from './elements/SixToPass.svelte';
import { tileImages } from '../tileImages';
import { m } from '$lib/paraglide/messages';
import type { LocalizedText } from '$lib/i18n/text';

export interface Tile<T extends object, Y extends object> {
	image?: string;
	message?: LocalizedText;
	customElement?: Component<ElementProps & T, { onActionButtonClick?: () => void }>;
	props?: T;
	moveStartMessage?: LocalizedText;
	moveStartElement?: Component<ElementProps & Y, { onActionButtonClick?: () => void }>;
	moveStartProps?: Y;
	customWait?: boolean;
	unskippable?: boolean;
}

const tileTypes: { [key: string]: Tile<any, any> } = {
	challenge: {
		image: tileImages.haaste,
		message: () => m.tile_challenge(),
		customElement: Haaste
	},
	drink2: {
		image: tileImages.kaksihuikkaa,
		message: () => m.tile_drink2()
	},
	drink3: {
		image: tileImages.kolmehuikkaa,
		message: () => m.tile_drink3()
	},
	drink4: {
		image: tileImages.neljahuikkaa,
		message: () => m.tile_drink4()
	},
	paskaHeitto: {
		image: tileImages.paskaHeitto,
		message: () => m.tile_drink5()
	},
	drink5: {
		image: tileImages.viisiHuikkaa,
		message: () => m.tile_drink5()
	},
	give3: {
		image: tileImages.jaa3,
		message: () => m.tile_give3()
	},
	give6: {
		image: tileImages.jaa6,
		message: () => m.tile_give6()
	},
	give9: {
		image: tileImages.jaa9,
		message: () => m.tile_give9()
	},
	mostDrunkDrinks3: {
		image: tileImages.enitenSuba,
		message: () => m.tile_most_drunk_drinks3()
	},
	leastDrunkDrinks5: {
		image: tileImages.vahitenSuba,
		message: () => m.tile_least_drunk_drinks5()
	},
	everyoneDrinks2: {
		image: tileImages.kaikkiJuo2,
		message: () => m.tile_everyone_drinks2()
	},
	everyoneDrinks3ExceptYou: {
		image: tileImages.kaikkiJuo3,
		message: () => m.tile_everyone_drinks3_except_you()
	},
	onetwothree: {
		image: tileImages.yksikaksikolme,
		message: () => m.tile_onetwothree(),
		customElement: Text,
		props: {
			text: () => m.tile_onetwothree_text()
		}
	},
	shutup: {
		image: tileImages.turpaHiljaa,
		message: () => m.tile_shutup()
	},
	safe: {
		image: tileImages.safe,
		message: () => m.tile_safe(),
		customElement: Text,
		props: {
			text: () => m.tile_safe_text()
		}
	},
	shot: {
		image: tileImages.shotti,
		message: () => m.tile_shot()
	},
	waterfall: {
		image: tileImages.vesiputous,
		message: () => m.tile_waterfall(),
		customElement: Text,
		props: {
			text: () => m.tile_waterfall_text()
		}
	},
	wheel: {
		customElement: RajuPyora
	},
	water: {
		image: tileImages.valivesi,
		message: () => m.tile_water()
	},
	groupShot: {
		image: tileImages.ryhmashotti,
		message: () => m.tile_group_shot(),
		customElement: Text,
		props: {
			text: () => m.tile_group_shot_text()
		}
	},
	leftDrinks3: {
		image: tileImages.vasenSipuli,
		message: () => m.tile_left_drinks3()
	},
	rightDrinks3: {
		image: tileImages.oikeaMies,
		message: () => m.tile_right_drinks3()
	},
	dieRollBack: {
		image: tileImages.noppa,
		message: () => m.tile_die_roll_back(),
		customElement: DiceRollBack
	},
	dieRollBackx2: {
		image: tileImages.noppaX2,
		message: () => m.tile_die_roll_back_x2(),
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
		message: () => m.tile_rule()
	},
	dices35back: {
		image: tileImages.kolmekymmentaviisitaakse,
		message: () => m.tile_dices35back(),
		customElement: Dices35Back,
		moveStartMessage: () => m.tile_dices35back(),
		moveStartElement: Dices35Back
	},
	sixToWin: {
		image: tileImages.noppaMaali,
		message: () => m.tile_six_to_win(),
		unskippable: true,
		customElement: SixToPass
	},
	win: {
		message: () => m.tile_win(),
		customElement: Text,
		props: {
			text: () => m.tile_win_text()
		},
		unskippable: true
	}
};

export const tiles: { [key: number]: Tile<any, any> } = {
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
};
