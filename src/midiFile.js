import { ByteReader } from "./byteReader.js"


export class MidiFile
{
	static fromReader(r)
	{
		let midi = new MidiFile()
		midi.readHeader(r)
		midi.readTracks(r)
		
		return midi
	}
	
	
	readHeader(r)
	{
		if (r.readAsciiLength(4) != "MThd")
			throw "invalid midi header magic"
		
		this.headerLength = r.readUInt32BE()
		
		this.format = r.readUInt16BE()
		this.trackNum = r.readUInt16BE()
		this.timeDivisionRaw = r.readUInt16BE()
		
		this.timeDivisionFormat = (this.timeDivisionRaw & 0x8000) != 0
		
		if (this.timeDivisionFormat)
			throw "unsupported time division format"
		
		this.ticksPerQuarterNote = (this.timeDivisionRaw & 0x7fff)
		
		r.seek(8 + this.headerLength)
	}
	
	
	readTracks(r)
	{
		this.tracks = []
		
		for (let i = 0; i < this.trackNum; i++)
			this.tracks.push(this.readTrack(r))
	}
	
	
	readTrack(r)
	{
		if (r.readAsciiLength(4) != "MTrk")
			throw "invalid midi track magic"
		
		let track = { }
		
		track.length = r.readUInt32BE()
		track.events = []
		
		let runningModePreviousCode = -1
		
		let eventStartPos = r.getPosition()
		while (r.getPosition() < eventStartPos + track.length)
		{
			const event = this.readTrackEvent(r, runningModePreviousCode)
			runningModePreviousCode = event.code
			track.events.push(event)
		}
		
		r.seek(eventStartPos + track.length)
		
		return track
	}
	
	
	readTrackEvent(r, runningModePreviousCode)
	{
		let event = { }
		
		event.deltaTime = this.readVarLengthUInt(r)
		
		if ((r.peekByte() & 0x80) == 0)
			event.code = runningModePreviousCode
		else
			event.code = r.readByte()
		
		if (event.code >= 0x80 && event.code <= 0xef)
		{
			if (event.code >= 0xc0 && event.code <= 0xdf)
				event.rawData = r.readBytes(1)
			else
				event.rawData = r.readBytes(2)
			
			this.decodeChannelVoiceEvent(event)
		}
		else if (event.code >= 0xf0 && event.code <= 0xfe)
		{
			event.length = this.readVarLengthUInt(r)
			event.rawData = r.readBytes(event.length)
		}
		else if (event.code == 0xff)
		{
			event.metaType = r.readByte()
			event.length = this.readVarLengthUInt(r)
			event.rawData = r.readBytes(event.length)
			this.decodeMetaEvent(event)
		}
		else
			throw "invalid track event code 0x" + event.code.toString(16)
		
		return event
	}
	
	
	decodeChannelVoiceEvent(event)
	{
		const isNoteOff = (event.code & 0xf0) == 0x80
		const isNoteOn = (event.code & 0xf0) == 0x90
		
		if (isNoteOff || isNoteOn)
		{
			event.key = event.rawData[0]
			event.velocity = event.rawData[1]
			
			const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
			const noteName = noteNames[event.key % 12]
			const noteOctave = Math.floor(event.key / 12)
			
			event.description =
				(isNoteOff ? "[8*] Note Off: " : "[9*] Note On: ") +
				noteName + noteOctave + ", Velocity: " + event.velocity
		}
	}
	
	
	decodeMetaEvent(event)
	{
		let r = new ByteReader(event.rawData)
		
		if (event.metaType == 0x2f)
			event.description = "[FF 2F] End of Track"
		
		else if (event.metaType == 0x51)
		{
			event.tempo = r.readUInt24BE()
			event.description =
				"[FF 51] Set Tempo: " +
				event.tempo + " µs/quarter note"
		}
		
		else if (event.metaType == 0x7f)
		{
			event.text = r.readAsciiLength(event.length)
			event.description =
				"[FF 7F] Sequencer-Specific: " +
				event.text
		}
	}
	
	
	readVarLengthUInt(r)
	{
		let value = 0
		
		while (true)
		{
			let byte = r.readByte()
			value = (value << 7) + (byte & 0x7f)
			
			if ((byte & 0x80) == 0)
				break
		}
		
		return value
	}
}