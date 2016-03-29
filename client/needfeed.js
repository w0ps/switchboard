var chatWindows = {};

Template.needs.events( {
  "keyup input[name=need]": function( event ) {
    if( event.keyCode !== 13 ) return;
    var value = event.target.value, split, description;
    if( !value ) return;
    event.target.value = '';

    Meteor.call( 'addNeed', value );
  }
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

Template.need.events( {
  'click button.delete': function( event ) {
    Meteor.call( 'deleteNeed', this._id );
  },
  'click a.open-chat': function( event ) {
    event.preventDefault();

    if( isAllowed( 'separate windows' ) ) {
      var windowName = this.title;

      chatWindows[ windowName ] = window.open( event.target.href, windowName, 'height=' + constants.chatHeight + ',width=' + constants.chatWidth + ',left=' + window.innerWidth );
      return false;
    }

    var openConversations = Session.get( 'openConversations' ) && Session.get( 'openConversations' ).slice() || [],
        index = openConversations.indexOf( this._id );

    if( index > -1 ) openConversations.splice( index, 1 );
    openConversations.unshift( this._id );

    Session.set( 'openConversations', openConversations );
    Meteor.call( 'joinChat', this._id );
  },
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


var storeEditTimeout;

function contentEdit( event ) {
  var id = this._id,
      type = this.type,
      content = event.target.textContent;

  clearTimeout( storeEditTimeout );

  if( event.type === 'focusout' || event.type === 'blur' ) storeEdit();
  else storeEditTimeout = setTimeout( storeEdit, constants.editableTypingStoreDelay * 1000 );

  function storeEdit() {
    Meteor.call( 'changeNeedTitle', id, content );
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
