# Sounds

Every sound on the site is generated in the browser (`app/js/sound/voices.js`);
there are no audio files in the site itself. These WAVs are offline renders of
the same code through the same mix chain at the default settings, so you can
audition them without opening the page.

| File | When it plays | Peak |
|---|---|---|
| focus.wav | a card comes into focus, or About/Contact opens | -17.6 dBFS |
| close.wav | stepping back out | -20.1 |
| confirm.wav | Enter, understood | -19.5 |
| unsure.wav | Enter, not understood | -23.6 |
| understood.wav | a typed word gets underlined | -24.6 |
| type.wav / typing-sentence.wav | each key while typing | -27.8 |
| shape.wav | the bar changes shape | -25.5 |
| deal.wav / deal-x19.wav | each card setting off in a deal or rearrange | -25.8 |
| lift.wav / drop.wav | picking a card up, putting it down | -23.4 / -19.9 |
| flight.wav | a long camera flight: impact, swell, ease out, landing | -12.5 (about -27 average) |
| flight-hop.wav | a short hop: a soft whisper, no impact | -26.2 |
| flight-old-harsh.wav | the first flight sound, kept for comparison | -21.5 |

Shape them live in the Tune panel (D): Volume, Flight, Flight space, Ticks and
taps, Brightness, Room. Brightness no longer touches the flight.

## The flight, rebuilt

The first version was white noise through a band filter sweeping up to about
4 kHz: spectral centre 5.1 kHz, as much energy above 4 kHz as below. Harsh.

Now: soft (pink to brown) noise in stereo, high-passed at 140 Hz and
low-passed at no more than 1.7 kHz; a quiet detuned fifth at 110/165 Hz under
it that rises a semitone at full speed; one soft push (160 to 80 Hz plus its
octave) when a long flight sets off and a quiet breath when it lands; a gentle
compressor gluing it together; its own send into the room. Speed is smoothed
(0.25 s in, 0.5 s out) so it breathes with the camera. Measured: centre about
250 Hz, everything above 4 kHz about 39 dB down.
