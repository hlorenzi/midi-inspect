import { ByteReader } from "./byteReader.js"
import { MidiFile } from "./midiFile.js"


let gMidiBytes = null
let gMidi = null


const inputFile = document.getElementById("inputFile")
inputFile.onchange = () =>
{
	let reader = new FileReader()
	reader.onload = () => loadFile(new Uint8Array(reader.result))
	reader.readAsArrayBuffer(inputFile.files[0])
}


const buttonResampleTicksDownload = document.getElementById("buttonResampleTicksDownload")
buttonResampleTicksDownload.onclick = () => resampleTicksAndDownload()


function loadFile(bytes)
{
	gMidiBytes = bytes
	
	let r = new ByteReader(gMidiBytes)
	gMidi = MidiFile.fromReader(r)
	
	console.log(gMidi)
	
	document.getElementById("inputNewResampleTicks").value = gMidi.ticksPerQuarterNote
}


function resampleTicksAndDownload()
{
	if (gMidiBytes == null)
		return
	
	let r = new ByteReader(gMidiBytes)
	let midi = MidiFile.fromReader(r)
	
	const newTicksPerQuarter = parseFloat(document.getElementById("inputNewResampleTicks").value)
	midi.resampleTicks(midi.ticksPerQuarterNote / newTicksPerQuarter)
	
	const midiBytes = midi.writeFile()
	
	let elem = document.createElement("a")
	elem.href = "data:application/octet-stream;charset=utf-16le;base64," + encodeURIComponent(arrayToBase64(midiBytes))
	elem.download = "song.mid"
	elem.style.display = "none"
	
	document.body.appendChild(elem)
	elem.click()
	document.body.removeChild(elem)
}


function arrayToBase64(array)
{
	let arrayAsAscii = ""
	for (let i = 0; i < array.length; i++)
		arrayAsAscii += String.fromCharCode(array[i])
	
	return window.btoa(arrayAsAscii)
}