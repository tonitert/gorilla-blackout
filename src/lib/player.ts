import type { playerImages } from "./components/game/playerImages";

export class Player {
    position: number;
    id: string;

    constructor(public name: string, public image: keyof typeof playerImages | "default", position?: number, id?: string) {
        this.position = position || 0; // Default starting position
        this.id = id || crypto.randomUUID();
    }
}