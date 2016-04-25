var chatWindows = {};

// JF 2016-04-12
// feedlist = new Meteor.Collection("feedlist");
// /JF

Template.needs.events( {
  "keyup input[name=need]": keyupNeedInput,
  'focus [contentEditable=true]': editableFocusHandler,
  'blur [contentEditable=true]': editableBlurHandler,
  //JF commented out: 'click #needlist > .resource': clickAddResource,
  'click .need .resourceButton': clickAddResourceToNeed
} );

// JF added:
Template.needlist.events( { 
  'click .resourceButton': clickAddResource,
} );
// /JF

Template.resource.helpers( { 
  isNotNull:  function(value) {
    console.log("Resource value: ".concat(value));
    return value != null ;
    //return value !== "";
  }       
} );

Template.freeResource.helpers( { 
  isNotNull:  function(value) {
    console.log("freeResource value: ".concat(value));
    return value != null ;
    //return value !== "";
  }       
} );


Template.needlist.helpers( {
  needs: function() {
    return Needs.find( { snapshot: { $exists: false } }, { sort: { created: -1 } } );
  },
  getLooseResources: function() {
    return Resources.find(
      { sourceId: { $exists: false }, snapshot: { $exists: false } },
      { sort: { created: -1  } }
    );
  }
  
  // JF 2016-04-12 Create mixed client side collection of needs and resources
  ,
  needsAndLooseResources: function() {
    var tempNeeds = Needs.find( { snapshot: { $exists: false } } ).fetch();
    var tempLooseResources = Resources.find( { sourceId: { $exists: false }, snapshot: { $exists: false } } ).fetch();
    var tempNeedsAndLooseResources = tempNeeds.concat(tempLooseResources);
    return _.sortBy(tempNeedsAndLooseResources, function(tempNeedsAndLooseResources) {return -tempNeedsAndLooseResources.created;});  
  },
  
  isNotNull:  function(value) {
    console.log("needlist value: ".concat(value));
    return value != null;
  }   
  
  // /JF
  
} );



/* -- JF commented out 2016-04-12 

Template.needlist.helpers( {
  needs: function() {
    return Needs.find( { snapshot: { $exists: false } }, { sort: { created: -1 } } );
  },
  getLooseResources: function() {
    return Resources.find(
      { sourceId: { $exists: false }, snapshot: { $exists: false } },
      { sort: { created: -1  } }
    );
  }
  
} );

*/

Template.chatcollection.helpers( {
  conversations: function(){
    return Session.get( 'openConversations' );
  }
} );

Template.need.helpers( {
  getResources: function( sourceId ) {
    return Resources.find( { sourceId: sourceId } );
  },

  isNotNull:  function(value) {

    console.log("Need value: ".concat(value));
    
    return value != null;
  }   
  
  
} );

Template.need.events( {

// JF: orginal line was:  'click li.need': openChat,
// instead of this, only open a chat when clicked on the NAME:
  'click li.need .name': openChat,
  
  'click li.need [contentEditable=true]': function() {
    return false;},
    
  // JF added:  
  'click .resourceButton': clickAddResourceToNeed
  // /JF
} );

Template.chatcollection.events( {
  'click .close': closeChat
} );

function keyupNeedInput( event ) {
  var value = event.target.value,
      split, description;

  if( event.keyCode !== 13 ) {
    if( value ) {
      event.target.parentNode.querySelector( '.resourceButton' ).style = 'display: inherit';
    } else event.target.parentNode.querySelector( '.resourceButton' ).style = 'display: none';
    return;
  }

  if( !value ) return;

  event.target.value = '';
  event.target.parentNode.querySelector( '.resourceButton' ).style = 'display: none';

  Meteor.call( 'addNeed', value );
}

function clickAddResource( event ) {
  var input = event.target.parentNode.querySelector( '[name=need]' ),
      value = input.value;

  // JF debug  
  // alert ("clickAddResource - " + value);
  // /JF


  input.value = '';
  event.target.style = '';

  Meteor.call( 'addResource', value );
}

function clickAddResourceToNeed( event ) {
  var need = this,
      resourceInput = document.createElement( 'input' ),
      needElement = event.target.parentNode,
      list = needElement.parentNode;


  resourceInput.className = 'inverted';
  resourceInput.style = 'width: 100%';

  list.insertBefore( resourceInput, needElement.nextSibling );

  resourceInput.focus();

  resourceInput.addEventListener( 'blur', blur );
  resourceInput.addEventListener( 'keyup', keyup );

  return false; // prevent need click -> chat open

  function blur( event ) {
    list.removeChild( resourceInput );
  }

  function keyup( event ) {
    var value = getValueIfReturnKey( event );

    if( event.keyCode === 27 ) { // esc
      return resourceInput.blur();
    }

    if( !value ) return;

    console.log( need._id );
    Meteor.call( 'addResource', value, need._id );
    resourceInput.blur();
  }
}

function openChat( event ) {
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
}

function closeChat() {
  var sourceId = this.toString();
  Meteor.call( 'leaveChat', sourceId );
  Meteor.call( 'stopTyping', sourceId );

  var openConversations = Session.get( 'openConversations' ).slice(),
      index = openConversations.indexOf( sourceId );

  if( index > -1 ) openConversations.splice( index, 1 );
  Session.set( 'openConversations', openConversations );
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
