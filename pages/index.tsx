
import React, { useState } from 'react'

import initNoirWasm, { acir_read_bytes, compile } from "@noir-lang/noir_wasm";
import initialiseAztecBackend from "@noir-lang/aztec_backend";
// @ts-ignore
import { initialiseResolver } from "@noir-lang/noir-source-resolver";
// @ts-ignore
import { setup_generic_prover_and_verifier } from '@noir-lang/barretenberg';


export const compileCircuit = async (noirCode) => {
  await initNoirWasm();

  initialiseResolver(() => {
    return noirCode;
  });
  try {
    const compiled_noir = compile({});
    return compiled_noir;
  } catch (e) {
      console.log("Error while compiling:", e);
  }
}

export const getAcir = async (noirCodeText) => {
    const { circuit, abi } = await compileCircuit(noirCodeText);
    await initialiseAztecBackend();

    // @ts-ignore
    let acir_bytes = new Uint8Array(Buffer.from(circuit, "hex"));
    return [ acir_read_bytes(acir_bytes), abi ]
}

export default function Page() {
  const [x, setX] = useState<string>("");
  const [y, setY] = useState<string>("");
  const [noirCodeText, setNoirCodeText] = useState("// src/main.nr\nfn main(x : Field, y : pub Field) {\n    constrain x != y;\n}");
  const [solidityVerifierText, setSolidityVerifierText] = useState("");
  const [acir, setACIR] = useState(null);
  const [proofText, setProofText] = useState("Your proof will appear here");

  const handleNoirCodeTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNoirCodeText(event.target.value);
  };

  const handleGenerateFromNoirCode = async () => {
    console.log(noirCodeText);

    console.log("Initializing...")
    const [acirTemp, abi] = await getAcir(noirCodeText)
    setACIR(acirTemp)
    console.log("Generating prover and verifier...")
    let [prover, verifier] = await setup_generic_prover_and_verifier(acirTemp);
    console.log("Prover:")
    console.log(prover)
    console.log("Verifier:")
    console.log(verifier)

    setSolidityVerifierText(verifier.ethSmartContract);
  };

  const handleClick = async () => {
    console.log("Generating proof...")
    const worker = new Worker(new URL('../pages/worker.ts', import.meta.url));
    worker.onmessage = (e) => {
      if (e.data instanceof Error) {
        console.log("There was an error generating the proof")
      } else {
        console.log("The proof was generated")
        setProofText("0x" + Buffer.from(e.data).toString('hex'))
      }
    }
    worker.postMessage({ acir, input: {x: parseInt(x), y: parseInt(y)} });
    console.log("Finished async function")
  };

  return (
    <>
      <h1>Aztec Noir Example</h1>
      <div>
        <h2>Step1: Generate a verifier from a Noir circuit</h2>
        <label>
            Noir Circuit:
        </label>
        <br />
        <textarea rows={10} cols={50} defaultValue={noirCodeText} onChange={handleNoirCodeTextChange}></textarea>
        <br />
        <button onClick={handleGenerateFromNoirCode}>Generate Verifier</button>
        <h2>Step2: Launch your Solidity Verifier</h2>
        <textarea rows={10} cols={50} defaultValue={solidityVerifierText}></textarea>
        <h2>Step3: Generate a proof</h2>
        <label>
          X:
          <input type="text" defaultValue={x} onChange={(e) => setX(e.target.value)} />
        </label>
        <br />
        <label>
          Y:
          <input type="text" defaultValue={y} onChange={(e) => setY(e.target.value)} />
        </label>
        <br />
        <button onClick={handleClick}>Generate Proof</button>
        <p>{proofText}</p>
      </div>
    </>  
  )
}
