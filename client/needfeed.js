var chatWindows = {},
    chatWidth = 300,
    chatHeight = 400;

Template.needs.events( {
  "keyup input[name=need]": function( event ) {
    if( event.keyCode !== 13 ) return;
    var value = event.target.value, split, description;
    if( !value ) return;
    event.target.value = '';

    Meteor.call( 'addNeed', value );
  }
} );

Template.needs.helpers( {
  needs: function() {
    return Needs.find( { snapshot: { $exists: false } }, { sort: { created: -1 } } );
  }
} );

Template.need.events( {
  'click button.delete': function( event ) {
    Meteor.call( 'deleteNeed', this._id );
  },
  'click a.open-chat': function( event ) {
    event.preventDefault();

    var windowName = this.title;

    chatWindows[ windowName ] = window.open( event.target.href, windowName, 'height=' + chatHeight + ',width=' + chatWidth + ',left=' + window.innerWidth );
    return false;
  }
} );


var previousNeedTitles;

Template.needs.onRendered( onRendered );

function onRendered() {
  Tracker.autorun( function(){

    var currentNeedTitles = [],
        prevTitles = previousNeedTitles ? previousNeedTitles.slice() : [];

    Needs.find( { snapshot: { $exists: false } } ).forEach( registerName );

    if( previousNeedTitles && currentNeedTitles.length > previousNeedTitles.length ) {
      playSound( 'pop1' ); // new need
    }

    if( prevTitles.length ) {
      playSound( 'snare' ); // changed need
    }

    previousNeedTitles = currentNeedTitles;

    function registerName( need ) {
      var title = need.title,
          index;

      currentNeedTitles.push( title );
      index = prevTitles.indexOf( title );
      if( index > -1 ) {
        prevTitles.splice( index, 1 );
      }
    }
  } );
}
