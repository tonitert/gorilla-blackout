<script lang="ts" module>
 import { z } from "zod/v4";
 
 const formSchema = z.object({
  username: z.string().min(2).max(50)
 });
</script>

<script lang="ts">
    import { defaults, superForm } from "sveltekit-superforms";
    import { zod4 } from "sveltekit-superforms/adapters";
    import * as Form from "$lib/components/ui/form/index.js";
    import { Input } from "$lib/components/ui/input/index.js";

    let players: string[] = $state([
        ""
    ]);
    const {
        onStart
    }: {
        onStart: (players: string[]) => void
    } = $props();

    
    
    const form = superForm(defaults(zod4(formSchema)), {
     validators: zod4(formSchema),
     SPA: true,
     onUpdate: ({ form: f }) => {
        
     }
    });

    const { form: formData, enhance } = form;

</script>
 
<form class="w-2/3 space-y-6" use:enhance>
    {#each players as player}
        <Form.Field {form} name="player">
            <Form.Control>
                {#snippet children({ props })}
                    <Form.Label>Username</Form.Label>
                    <Input {...props} bind:value={$formData.username} />
                {/snippet}
            </Form.Control>
            <Form.Description>This is your public display name.</Form.Description>
            <Form.FieldErrors />
        </Form.Field>
    {/each}
    <Form.Button>Submit</Form.Button>
</form>