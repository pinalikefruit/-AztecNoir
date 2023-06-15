// @ts-ignore
import { create_proof, setup_generic_prover_and_verifier} from '@noir-lang/barretenberg';
import initializeAztecBackend from '@noir-lang/aztec_backend';

onmessage = async (event) => {
    try {
        await initializeAztecBackend();
        const { acir, input } = event.data;
        const [prover, verifier] = await setup_generic_prover_and_verifier(acir);
        const proof = await create_proof(prover, acir, input)
        postMessage(proof)
        console.log("Proof:")
        console.log(proof)
    } catch(er) {
        postMessage(er)
    } finally {
        close();
    }
};