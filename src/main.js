import { ByteReader } from "./byteReader.js"
import { MidiFile } from "./midiFile.js"


const inputFile = document.getElementById("inputFile")
inputFile.onchange = () =>
{
	let reader = new FileReader()
	reader.onload = () => loadFile(new Uint8Array(reader.result))
	reader.readAsArrayBuffer(inputFile.files[0])
}


function loadFile(bytes)
{
	let r = new ByteReader(bytes)
	let midi = MidiFile.fromReader(r)
	
	console.log(bytes)
	console.log(midi)
}