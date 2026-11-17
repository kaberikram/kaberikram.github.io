# The chat

Everything the bar can say about you, in your own words. Edit freely: this file
is read by the site as it is, nothing to build.

How a topic is written:

    ## a name for the topic (only you see it)
    Q: a way someone might ask
    Q: another way (the more you add, the better it understands)
    A: what you say back
    A: another version (with several, it picks one at random)
    Show: just the AR work   (optional: the board moves too; anything the bar understands)
    Next: Where are you based?   (optional, up to 3: offered after the answer)
    Guess   (a draft, not yet your words: delete the line once it is)

Links in answers: [text](https://...). Lines that start with none of these are
ignored, so notes like this one are fine.

After editing questions, run `node tools/embed-chat.mjs` if you can, to make
the first answer faster. If you don't, nothing breaks: the visitor's browser
works out the new questions itself.

Two special topics: `## (nothing fits)` is what it says when no topic is close
enough, and `## (start)` holds the suggestions shown before anyone has asked.

---

## (start)
Next: Who are you?
Next: Show me your proudest work
Next: What are you working on now?

## (nothing fits)
A: Hmm, I haven't written an answer for that one yet. Ask me another way, or [write to me](mailto:ikramandhakim@gmail.com) and I'll tell you properly.
A: That one's not in my head yet. Try asking differently? Or [email me](mailto:ikramandhakim@gmail.com), I read everything.
Next: What do you make?
Next: Show me your proudest work
Next: How do I reach you?

## hello
Q: hi
Q: hello
Q: hey
Q: hey there
Q: hello there
Q: hi ikram
Q: good morning
Q: good evening
Q: yo
Q: salam
Q: assalamualaikum
A: Hi. I'm really glad you wandered in.
A: Hey, hello. Come in, look around.
A: Oh, hi. I was hoping someone would stop by.
Next: Who are you?
Next: What are you working on now?

## how are you
Q: how are you
Q: how are you doing
Q: how are you doing today
Q: how's it going
Q: how is your day
Q: are you ok
Q: what's up
Q: how have you been
A: I'm good. Probably in the middle of building something I meant to finish yesterday. How are you?
Next: What are you working on now?
Guess

## who
Q: who are you
Q: who is ikram
Q: who is this
Q: tell me about yourself
Q: introduce yourself
Q: what's your name
Q: what is your story
Q: a little about you
A: I'm Ikram Hakim, a creative technologist in Kuala Lumpur. I do design and dev, and I'm trying to make the future of interactions: AR, mixed reality, and small worlds in the browser.
Next: What do you make?
Next: What are you proudest of?
Next: Where are you based?

## what I do
Q: what do you do
Q: what do you make
Q: what's your job
Q: what do you do for work
Q: what is a creative technologist
Q: what kind of work do you do
Q: what are you good at
A: Design and dev, both. Mostly I'm trying to make the future of interactions: AR on Snap Spectacles, mixed reality on Quest, and creative things on the web.
Next: Show me your proudest work
Next: Tell me about your AR work
Next: What tools do you use?

## where
Q: where are you based
Q: where do you live
Q: where are you from
Q: which country are you in
Q: are you in malaysia
Q: what timezone are you in
Q: are you in kl
Q: do you work with people overseas
Q: do you work remotely
A: I'm based in KL, Kuala Lumpur. I work with people overseas too, so wherever you are is fine.
Next: Can I hire you?

## proudest
Q: what are you proudest of
Q: what's your best work
Q: what is your favourite project
Q: which project do you love most
Q: show me your highlights
Q: show me your proudest work
A: Reality to bend. I'd been wanting to recreate this effect from Spike Jonze for so long, and when I could finally make it, the whole thing felt effortless and magical. Here are the ones I love most.
Show: show me your proudest work
Next: What inspires you?
Next: What are you working on now?

## now
Q: what are you working on now
Q: what's new
Q: what are you up to these days
Q: what is your latest project
Q: what have you been making lately
Q: what are you building right now
A: Right now, a game! It's a TIC Corp collab with Tep York, the KL artist. It's still under wraps, so no spoilers yet. Meanwhile, here's the most recent stuff.
Show: what's most recent
Next: What is TIC Corp?
Next: Who is Tep York?
Next: How was this site made?

## AR
Q: do you do AR
Q: tell me about your AR work
Q: augmented reality
Q: what have you made for spectacles
Q: snap lenses
Q: lens studio
Q: have you worked with snapchat
Q: do you make filters or lenses
A: A lot of my AR lives on Snap Spectacles: small useful things like a teleprompter, a currency converter and a pomodoro timer, and Ghost Catch, a team game that came second at Snap AR Day London.
Show: just the AR work
Next: Did you win anything?
Next: What about mixed reality?

## awards
Q: did you win anything
Q: have you won awards
Q: what is ghost catch
Q: snap ar day
A: Ghost Catch, a Spectacles game I built with Ruby Bell and Orlando Mathias, came second at the Snap AR Day London hackathon in 2024. And back at uni, our VR game Makhluk Halus won gold at SIGG!
Show: Ghost Catch
Next: Tell me about your AR work

## mixed reality
Q: what about mixed reality
Q: do you make vr
Q: quest games
Q: what is dreampop
Q: tell me about dreampop
A: Dreampop is my mixed reality game for Quest, inspired by popping bubble wrap, bubble shooters and push-pop fidget toys. It's on the Meta Quest store! I also helped build Take a Leap, a jelly jumping game.
Show: Dreampop
Next: What do you make on the web?

## web
Q: what do you make on the web
Q: do you make websites
Q: creative coding
Q: three.js
Q: browser experiments
A: In the browser I make small worlds. World End Tree grows out of Spotify listening data, Speakfall lets your words fall when you speak, Depth Warp builds a room out of one photo.
Show: just the web work
Next: What tools do you use?

## tools
Q: what tools do you use
Q: what's your tech stack
Q: what software do you use
Q: do you use unity
Q: what languages do you code in
Q: do you know react
Q: do you code
A: Lens Studio for Spectacles, Unity or WebXR (IWSDK) for Quest, and Three.js or React Three Fiber on the web.
Next: Are you a designer or a developer?

## design
Q: are you a designer or a developer
Q: do you do ui ux
Q: what's your background
Q: where have you worked
Q: work experience
A: Both! Since March 2025 I've been a UI/UX designer at EPF, designing the i-Akaun app and looking after its design system. On the side I'm a contract creative developer for SHXFT, a Dubai studio: I built the MOMNTS face-AR editor, SCXPE and the studio's websites.
Show: product
Next: Can I hire you?

## TIC Corp
Q: what is tic corp
Q: do you sell clothes
Q: parody clothing
Q: do you have a shop
Q: what is laughwithtic
Q: who is behind tic corp
Q: are you part of a collective
Q: who runs tic corp
Q: who is in tic
Q: who are ceeq ichu and amir
A: TIC Corp is a parody clothing label I co-founded with my friends Ichu, Ceeq and Amir. We treat humour as interaction: the Rat'teryx Jacket is our deadpan send-up of Arc'teryx. I designed and built the whole site, shop and order tracking included. Come say hi at [laughwithtic.com](https://laughwithtic.com)!
Show: TIC Corp
Next: What are you working on now?

## hire
Q: can I hire you
Q: are you available for work
Q: are you open to freelance
Q: can we collaborate
Q: do you take commissions
Q: I have a project for you
Q: can you build something for me
Q: are you looking for a job
Q: are you open to full time
Q: are you open to collabs
A: Yes! I'm open to freelance, collabs and full-time. Write to me at [ikramandhakim@gmail.com](mailto:ikramandhakim@gmail.com) and tell me what you're making.
Next: How do I reach you?

## contact
Q: how do I reach you
Q: how can I contact you
Q: what's your email
Q: are you on instagram
Q: socials
A: Email is best: [ikramandhakim@gmail.com](mailto:ikramandhakim@gmail.com). I'm also on Instagram as [@kaberikram](https://instagram.com/kaberikram).

## inspiration
Q: what inspires you
Q: who are your influences
Q: favourite film
Q: favourite director
A: Spike Jonze! And everything that's going on around my life.
Next: What are you proudest of?
Next: What do you do for fun?

## this site
Q: how was this site made
Q: how did you build this
Q: what is this website made with
Q: how does this board work
A: By hand, slowly. Paper cards on springs in 3D, plain HTML, CSS and JavaScript, no framework. I keep [a log of how it grew](/making-of/LOG.md) if you're curious.
Next: How does this chat work?

## this chat
Q: how does this chat work
Q: are you real
Q: is this ai
Q: are you a bot
Q: is this chatgpt
Q: am I talking to you
Q: is this a real person
A: Not quite me, but close. I wrote these answers ahead of time, and a tiny model running in your browser picks the one that fits. Nothing you type leaves your device.
Next: Who are you?

## fun
Q: what do you do for fun
Q: hobbies
Q: what do you do outside work
Q: what do you do on weekends
Q: what else do you do
A: I make music!
Next: Where can I hear your music?

## education
Q: where did you study
Q: did you go to university
Q: what did you study
Q: do you have a degree
Q: what's your education
Q: which uni did you go to
Q: did you study design
A: I studied Virtual Reality Design at Multimedia University (MMU) in Cyberjaya, from 2018 to 2021. Before that, a diploma in digital animation at Limkokwing.
Next: How did you get into AR?
Next: What do you make?
Guess

## how I got into AR
Q: how did you get into AR
Q: how did you start
Q: how did you become a creative technologist
Q: what was your first AR project
Q: when did you start making AR
Q: what got you into this
Q: how did your career start
A: It started with my VR degree. Then in 2020 I made halohex, an AR music toy in Spark AR for a Facebook hackathon, and did an AR internship at PETRONAS Digital. After that it was agency life: FabU, then three-ish years making AR for brands at GOWAAA.
Next: Where have you worked?
Next: Did you win anything?
Guess

## GOWAAA
Q: what is gowaaa
Q: tell me about gowaaa
Q: did you work at an agency
Q: have you made filters for brands
Q: have you worked with big brands
Q: did you work in singapore
A: I was an AR/VR developer at GOWAAA, a Singapore studio, from late 2021 to early 2025. Lots of AR for brands on Instagram, Snapchat, TikTok and the web, plus the Google Maps geospatial AR for Singapore.
Next: Tell me about the Google Maps AR
Next: Tell me about your AR work
Guess

## google maps AR
Q: tell me about the google maps AR
Q: geospatial AR
Q: did you work with google
Q: google I/O
Q: what did you do for google maps
Q: singapore tourism board
Q: AR in google maps
A: With the GOWAAA team I helped make 15 geospatial AR experiences around Singapore, for the Singapore Tourism Board. They live inside Google Maps, part of a pilot Google announced at I/O 2024. I worked with the design team on concepts and built the experiences.
Show: Geospatial AR
Next: What about mixed reality?
Guess

## ghost catch story
Q: tell me the ghost catch story
Q: how did you make ghost catch
Q: what was snap ar day like
Q: how does ghost catch work
Q: did you go to london
Q: who did you make ghost catch with
A: At Snap AR Day London in December 2024, I teamed up with Ruby Bell and Orlando Mathias, who I'd only just met, for a 24-hour Spectacles hackathon. We made Ghost Catch: two players in the same room race to grab a cheeky ghost before the timer runs out. I did the dev, we came second, and it all felt surreal!
Show: Ghost Catch
Next: Did you win anything?
Guess

## hackathons
Q: do you do hackathons
Q: what hackathons have you joined
Q: have you been to a game jam
Q: have you competed in anything
Q: gemini hackathon
Q: vibe jam
A: I love a hackathon! Facebook's AR hackathon in 2020, Meta's Quest hackathon in 2024 (that's where Dreampop came from), Snap AR Day London, #vibejam, and the Gemini AI Hackathon at Google Japan in 2026.
Next: What is Dreampop?
Next: Did you win anything?
Guess

## music
Q: do you make music
Q: are you a musician
Q: where can I hear your music
Q: what kind of music do you make
Q: are you on soundcloud
Q: what's your artist name
Q: do you have songs out
A: I do! Little songs on [SoundCloud](https://soundcloud.com/kaberikram), just under my name. I also made Dreampop's music and sound effects myself.
Next: What do you do for fun?
Guess

## Tep York
Q: who is tep york
Q: what is tep york
Q: who is ty
Q: tell me about tep york
Q: who are you making the game with
A: Tep York (TY) is a Kuala Lumpur artist who used to run the skate company QUIT. [Here's a nice profile of him](https://www.artandmarket.net/fresh-face/2025/2/26/tep-york).
Next: What is TIC Corp?
Next: What are you working on now?
Guess

## press
Q: have you been featured anywhere
Q: press
Q: have you been on codrops
Q: has anyone written about you
Q: features
A: Codrops featured my drag-a-shirt-onto-a-model idea in 2025: [Try It On](https://tympanus.net/codrops/2025/06/06/try-it-on-a-playful-drag-and-drop-styling-ui/). I first made it for my friends at TIC.
Show: Styling Canvas
Next: What is TIC Corp?
Guess

## webxr experiments
Q: how did you make reality to bend
Q: what is reality to bend
Q: webxr
Q: what are you doing on quest 3
Q: is that running in the browser
Q: how did you bend the room
Q: what is dimensional
A: Lately it's all WebXR on Quest 3 passthrough, built with Meta's IWSDK and Three.js, right in the browser. [Reality to bend](https://www.instagram.com/reel/DeWqH_5NShD/) lets you grab a wall and stretch it like taffy (thank you, Spike Jonze), and [Dimensional](https://www.instagram.com/reel/DdnQuD9tr1a/) stacks a video's frames on my real table so you can scrub it by hand.
Show: Reality to bend
Next: What are you proudest of?
Guess

## EPF
Q: what do you do at epf
Q: tell me about epf
Q: what is i-akaun
Q: do you work in fintech
Q: have you designed an app people actually use
Q: tell me about your product design work
Q: do you work on design systems
A: I'm a UI/UX designer at EPF, Malaysia's retirement fund, since March 2025. I design flows and screens for the i-Akaun app, look after the Providence design system, and take prototypes out for real usability tests.
Show: product
Next: Can I hire you?
Guess

## SHXFT
Q: what is shxft
Q: tell me about shxft
Q: what is momnts
Q: what do you do for shxft
Q: do you work with a dubai studio
Q: what is scxpe
A: SHXFT is a creative tech studio in Dubai, and I've been a contract creative dev with them since December 2025. I built MOMNTS, a live face-AR editor, plus SCXPE, a photoreal 3D way to explore buildings in the browser.
Show: MOMNTS
Next: What do you make on the web?
Guess

## depth-vfx
Q: what is depth-vfx
Q: what is vtime
Q: tell me about depth vfx
Q: light becomes rays
Q: cinematic vfx on a phone
A: depth-vfx is a little real-time VFX toy for your phone camera: light turns into rays, like a film shot, live. It's at [vtime.vercel.app](https://vtime.vercel.app) (it'll ask for your camera).
Show: depth-vfx
Next: What do you make on the web?
Guess

## co-founder
Q: did you start a company
Q: are you a founder
Q: have you started anything of your own
Q: do you run a brand
A: Yep, I co-founded TIC Corp, a parody clothing label, with my friends. I'm the one who built the site!
Show: TIC Corp
Next: What is TIC Corp?
Guess

## spectacles
Q: when did you make the spectacles stuff
Q: tell me about your spectacles lenses
Q: what is the teleprompter
Q: did you make a currency converter
Q: pomodoro timer on spectacles
Q: when did you work on spectacles
Q: what lenses have you made for snap spectacles
A: All my Spectacles work happened between late 2024 and February 2025. I made small useful lenses: a teleprompter, a currency converter and a cozy pomodoro timer. And Ghost Catch, the hackathon game!
Show: just the AR work
Next: Tell me the Ghost Catch story
Guess

## age
Q: how old are you
Q: what's your age
Q: when were you born
A: Old enough!

## thanks
Q: thanks
Q: thank you
Q: cool
Q: nice
Q: love this
Q: this is beautiful
A: Thank you. That really means something.
A: Ah, thank you. I'm glad you're here.

## bye
Q: bye
Q: goodbye
Q: see you
Q: see you later
Q: I have to go
Q: cya
Q: good night
A: Bye for now. Come back when I've made something new.
A: Take care. The door's always open.
