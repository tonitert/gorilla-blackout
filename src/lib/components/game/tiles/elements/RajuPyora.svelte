<script lang="ts">
    import { type ElementProps } from "./elementProps";
	import { type SvelteComponent, type Component } from "svelte";
	import Text from "./text.svelte";
	import Spinner, { SpinnerOption } from "./Spinner.svelte";

    import wheel5050 from '$lib/assets/5050.png';
    import wheelImage from '$lib/assets/rajupyora.png';
	import MoveToStart from "./raju/MoveToStart.svelte";

    const {
		players,
        setActionButtonText,
        movePlayer,
        currentPlayerIndex,
        positions
	 }: ElementProps = $props();

    let spinnerInstance: SvelteComponent | undefined = $state(undefined);

    const options: SpinnerOption<any>[] = [
        {
            name: "Ryhmäshotti!"
        },
        {
            name: "Juo ja jaa 10!",
        },
        {
            name: "Palaa aloitusruutuun!",
            element: MoveToStart,
            props: {
                movePlayer,
                currentPlayerIndex,
                positions
            }
        },
        // 50/50
        new SpinnerOption(
            undefined,
            Spinner,
            {
                animation: false,
                options: [
                    new SpinnerOption("Ota 3 shottia!"),
                    new SpinnerOption("Jaa 3 shottia!"),
                ],
                spinsBeforeStop: 6,
                spinnerImage: wheel5050,

                setActionButtonText: setActionButtonText
            }
        ),
        {
            name: "Vähiten kännissä juo 10!"
        },
        {
            name: "Juo kortin luvun verran!"
        },
        {
            name: "Juo 5!"
        },
        new SpinnerOption(
            "Supersääntö!", 
            Text, 
            {
                text: "Keksi peliin supersääntö! Erona tavalliseen sääntöön supersääntö pysyy voimassa koko pelin ajan, ja rangaistus sen rikkomisesta on shotti."
            }
        ),
        {
            name: "Jaa 50!"
        },
        {
            name: "Tyhjennä juoma!"
        },
        {
            name: "Juo ja jaa 10 huikkaa!"
        },
        {
            name: "Ota shotti!"
        }
    ]
    const spinsBeforeStop = 6;

    export function onActionButtonClick() {
        spinnerInstance?.onActionButtonClick?.();
    }

</script>

<Spinner
    {options}
    {spinsBeforeStop}
    animation={true}
    spinnerImage={wheelImage}
    animationDuration={15000}
    players={players}
    setActionButtonText={setActionButtonText}
    bind:this={spinnerInstance}
    topOffset={6}
/>