var chatWindows = {};

Template.needs.events( {
  "keyup input[name=need]": function( event ) {
    if( event.keyCode !== 13 ) return;
    var value = event.target.value, split, description;
    if( !value ) return;
    event.target.value = '';

    Meteor.call( 'addNeed', value );
  },
  'focus [contentEditable=true]': editableFocusHandler,
  'blur [contentEditable=true]': editableBlurHandler,
  'click .need .supply': clickAddSupplyToNeed
} );

Template.needlist.helpers( {
  needs: function() {
    return Needs.find( { snapshot: { $exists: false } }, { sort: { created: -1 } } );
  }
} );

Template.chatcollection.helpers( {
  conversations: function(){
    return Session.get( 'openConversations' );
  }
} );

Template.need.helpers( {
  getSupplies: function( sourceId ) {
    console.log( 'getting supplies', sourceId );
    return Supplies.find( { sourceId: sourceId } );
  }
} );

Template.need.events( {
  'click button.delete': function( event ) {
    Meteor.call( 'deleteNeed', this._id );
  },
  'click li.need': function( event ) {
    if( isAllowed( 'separate windows' ) ) {
      var windowName = this.title;

      chatWindows[ windowName ] = window.open( '/needs/' + this._id, windowName, 'height=' + constants.chatHeight + ',width=' + constants.chatWidth + ',left=' + window.innerWidth );
      return false;
    }

    var openConversations = Session.get( 'openConversations' ) && Session.get( 'openConversations' ).slice() || [],
        index = openConversations.indexOf( this._id );

    if( index > -1 ) openConversations.splice( index, 1 );
    openConversations.unshift( this._id );

    Session.set( 'openConversations', openConversations );
    Meteor.call( 'joinChat', this._id );
  },
  'click li.need [contentEditable=true]': function() {
    return false;
  }
} );

Template.chatcollection.events( {
  'click .close': function() {
    var sourceId = this.toString();
    Meteor.call( 'leaveChat', sourceId );
    Meteor.call( 'stopTyping', sourceId );

    var openConversations = Session.get( 'openConversations' ).slice(),
        index = openConversations.indexOf( sourceId );

    if( index > -1 ) openConversations.splice( index, 1 );
    Session.set( 'openConversations', openConversations );
  }
} );

function clickAddSupplyToNeed( event ) {
  var need = this,
      supplyInput = document.createElement( 'input' ),
      needElement = event.target.parentNode,
      list = needElement.parentNode;

  supplyInput.className = 'inverted';
  supplyInput.style = 'width: 100%';

  list.insertBefore( supplyInput, needElement.nextSibling );

  supplyInput.focus();

  supplyInput.addEventListener( 'blur', blur );
  supplyInput.addEventListener( 'keyup', keyup );

  return false; // prevent need click -> chat open

  function blur( event ) {
    list.removeChild( supplyInput );
  }

  function keyup( event ) {
    var value = getValueIfReturnKey( event );

    if( event.keyCode === 27 ) { // esc
      return supplyInput.blur();
    }

    if( !value ) return;

    Meteor.call( 'addSupply', value, need._id );
    supplyInput.blur();
  }
}

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
