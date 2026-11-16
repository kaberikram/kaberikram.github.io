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
A: Right now, a game! It's a TIC Corp collab with Tep York. Meanwhile, here's the most recent stuff.
Show: what's most recent
Next: What is TIC Corp?
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
A: Lens Studio for Spectacles, Unity for Quest, and Three.js or React Three Fiber on the web.
Next: Are you a designer or a developer?

## design
Q: are you a designer or a developer
Q: do you do ui ux
Q: what's your background
Q: where have you worked
Q: work experience
A: Both! I see myself as design and dev. At EPF I maintain the i-Akaun mobile app design and design its new features. At SHXFT I've done a lot of agency work, from AR mirrors to AR filters to web games.
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
A: TIC Corp is me, Ceeq, Ichu and Amir. It's more of a creative collective: we do all sorts of things, but with a fashion focus. The shop is at [laughwithtic.com](https://laughwithtic.com).
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
Q: do you make music
Q: are you a musician
Q: what else do you do
A: I make music!

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
