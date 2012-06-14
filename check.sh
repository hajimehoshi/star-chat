#!/bin/sh

# Sorry, this script is not completed and probably you cannot use this.

java -jar compiler.jar \
    --js public/javascripts/caretposition.js \
    --js public/javascripts/star_chat.js \
    --js public/javascripts/star_chat/icons.js \
    --js public/javascripts/star_chat/packet_processor.js \
    --js public/javascripts/star_chat/session.js \
    --js public/javascripts/star_chat/stream.js \
    --js public/javascripts/star_chat/user.js \
    --js public/javascripts/star_chat/channel.js \
    --js public/javascripts/star_chat/subscribing.js \
    --js public/javascripts/star_chat/view.js \
    --js public/javascripts/star_chat/hashchange.js \
    --js public/javascripts/main.js \
    --jscomp_error checkTypes \
    --jscomp_error accessControls \
    --compilation_level ADVANCED_OPTIMIZATIONS \
    --externs jquery-1.7.extern.js > /dev/null

