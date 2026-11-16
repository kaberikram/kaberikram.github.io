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
A: I'm Ikram Hakim, a creative technologist in Malaysia. I make things you can step inside: AR for Snap Spectacles, mixed reality games for Quest, and small worlds in the browser.
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
A: I live somewhere between design and code. Mostly AR on Snap Spectacles, mixed reality on Quest, and creative web things. I like it when technology feels like a small surprise.
Next: Show me your proudest work
Next: Tell me about your AR work
Next: What tools do you use?
Guess

## where
Q: where are you based
Q: where do you live
Q: where are you from
Q: which country are you in
Q: are you in malaysia
Q: what timezone are you in
A: I'm in Malaysia. I work with people anywhere, though. Time zones are just a small puzzle.
Next: Can I hire you?
Guess

## proudest
Q: what are you proudest of
Q: what's your best work
Q: what is your favourite project
Q: which project do you love most
Q: show me your highlights
Q: show me your proudest work
A: Reality to bend, probably: a room that stretches and then shatters. Here are the ones I love most.
Show: show me your proudest work
Next: What are you working on now?
Guess

## now
Q: what are you working on now
Q: what's new
Q: what are you up to these days
Q: what is your latest project
Q: what have you been making lately
Q: what are you building right now
A: Lately I've been bending rooms. Reality to bend and Volta are the newest. Here's the recent stuff.
Show: what's most recent
Next: How was this site made?
Guess

## AR
Q: do you do AR
Q: tell me about your AR work
Q: augmented reality
Q: what have you made for spectacles
Q: snap lenses
Q: lens studio
Q: have you worked with snapchat
Q: do you make filters or lenses
A: A lot of my AR lives on Snap Spectacles: small useful things like a teleprompter, a currency converter and a pomodoro timer, and Ghost Catch, which came second at Snap AR Day.
Show: just the AR work
Next: Did you win anything?
Next: What about mixed reality?

## awards
Q: did you win anything
Q: have you won awards
Q: what is ghost catch
Q: snap ar day
A: Ghost Catch, my game for Snap Spectacles, came second at Snap AR Day in 2024.
Show: Ghost Catch
Next: Tell me about your AR work

## mixed reality
Q: what about mixed reality
Q: do you make vr
Q: quest games
Q: what is dreampop
Q: tell me about dreampop
A: Dreampop is a mixed reality game for Quest, inspired by popping bubble wrap, bubble shooters and push-pop fidget toys. Take a Leap is another one.
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
A: Lens Studio for Spectacles, Unity for Quest, and Three.js or React Three Fiber on the web. Usually a lot of sketching before any of it.
Next: Are you a designer or a developer?
Guess

## design
Q: are you a designer or a developer
Q: do you do ui ux
Q: what's your background
Q: where have you worked
Q: work experience
A: Both, honestly. I was a UI/UX designer at EPF on i-Akaun, and a creative developer at SHXFT Studio. I like living in the gap between the two.
Show: product
Next: Can I hire you?
Guess

## TIC Corp
Q: what is tic corp
Q: do you sell clothes
Q: parody clothing
Q: do you have a shop
A: TIC Corp is my parody clothing label. It's a joke, but a real one: it's a working shop.
Show: TIC Corp
Guess

## hire
Q: can I hire you
Q: are you available for work
Q: are you open to freelance
Q: can we collaborate
Q: do you take commissions
Q: I have a project for you
Q: can you build something for me
Q: are you looking for a job
A: I'd love to hear what you're making. Write to me at [ikramandhakim@gmail.com](mailto:ikramandhakim@gmail.com) and tell me about it.
Next: How do I reach you?
Guess

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
A: Spike Jonze, mostly. Her, and that film where a room stretches around a dancer. Things that feel soft, a little lonely, and full of light.
Next: How was this site made?
Guess

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
A: Trying whatever headset is newest, walking around with a camera, and thinking about rooms far too much.
Guess

## age
Q: how old are you
Q: what's your age
Q: when were you born
A: Old enough to remember Flash websites, young enough to still get giddy about every new headset.
Guess

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
