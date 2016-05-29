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
    // console.log("Resource value: ".concat(value));
    return value != null ;
    //return value !== "";
  }       
} );

Template.freeResource.helpers( { 
  isNotNull:  function(value) {
    // console.log("freeResource value: ".concat(value));
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
    // console.log("needlist value: ".concat(value));
    return value != null;
  }   
  
  // /JF
 
  // JF 2016-04-28 - for rendering the MULTI COLUMN VIEW (handled by CSS .needs-multiColumn)
  ,  
  needsMultiColumn: function() {
  
    // console.log ("--------needsMultiColumn-------");
    // console.log ("$(window).width(): "+$(window).width());
    if ( ($(window).width() > 350) && (isAllowed( 'needs multicolumn' )) )  {
        return "needs-multiColumn";
    }
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
  },
  tagconversations: function(){
    return Session.get( 'openTagConversations' );
  }
} );

Template.need.helpers( {
  getResources: function( sourceId ) {
    return Resources.find( { sourceId: sourceId } );
  },

  isNotNull:  function(value) {

    // console.log("Need value: ".concat(value));
    
    return value != null;
  },   

  // JF 2016-04-24
  // returns ids of users that posted needs with the specified tags. excludes the specified user from the results.
  getTagUsers: function( tags, userid ) {

    var tempTags = tags;
    
    if (tempTags.length < 1) { 
        return null;
    } else {
        
        // find other needs with the same tag(s) 

        var tempNeedUserId = userid;
        var selector1 = {snapshot: { $exists: false } };
                        // check only for needs tagged by OTHER users
        var selector2 =  {createdBy: {$ne: tempNeedUserId}};
        var selector3 = {tags: {$in:tempTags}};
        
                        // return only the field createdBy (= userID of the creator of the need)
        var options = {fields: {createdBy: 1}};
        
        var tempNeedsWithSameTag = Needs.find( { $and: [selector1, selector2, selector3]}, options);
        //var tempNeedsWithSameTag = Needs.find( { $and: [selector1, selector2, selector3]});
        
        //var htmlString;

        /*
        console.log ("---getTagUsers---")
        console.log ("tempTags: ".concat(tempTags));
        console.log ("userIds: "); 
        */
    
        var countUsernames = 0;
        var userNames = '';
        var userIDsArray = [];
        var userNamesArray = [];
           
        tempNeedsWithSameTag.forEach(function(doc){
        
            // convert userId to userName
            var tempUserId = doc.createdBy;            
            var tempUser = Meteor.users.findOne( { _id: tempUserId} );
            var tempUserName = tempUser ? tempUser.username : tempUser;
 
            // console.log('UserID: '+doc.createdBy + '- Username:' +tempUserName);
                        
            userIDsArray.push(tempUserId);
            userNamesArray.push(tempUserName);
                
            countUsernames = countUsernames+1;
            
        });
        
        if (countUsernames > 0) {
            
            // no double usernames
            userIDsArray = _.uniq(userIDsArray);
            userNamesArray = _.uniq(userNamesArray);
                        
            return userIDsArray;
        } else {
            return null;
        }
    }
  
  },
  // /JF
  
  
} );

Template.need.events( {

// JF: orginal line was:  'click li.need': openChat,
// instead of this, only open a chat when clicked on the NAME:
  'click li.need .name': openChat,
  
  'click li.need [contentEditable=true]': function() {
    return false;},
    
  // JF added:  
  'click .resourceButton': clickAddResourceToNeed,
  // /JF

  // JF 2016-04-18
  // 'click li.need .tags': clickNeedTags
   // /JF
  'click .taglink': openTagChat
  
  
} );

Template.chatcollection.events( {
  'click .close': closeChat,
  'click .tagclose': closeTagChat
  
} );

function keyupNeedInput( event ) {
  var value = event.target.value,
      split, description;

  if( event.keyCode !== 13 ) {
    if( value ) {
      // event.target.parentNode.querySelector( '.resourceButton' ).style = 'display: inherit';
      // 2016-05-29 to hide the resource button (by Edits request)
      event.target.parentNode.querySelector( '.resourceButton' ).style = 'display: none';
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

    // console.log( need._id );
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

function openTagChat( event ) {

  // console.log ("---------openTagChat---------");
  // console.log ("this._id: "+  this._id);

  Meteor.call( 'updateAutogeneratedTagChatMessages', this._id );


  if( isAllowed( 'separate windows' ) ) {
    var windowName = this.title;

    chatWindows[ windowName ] = window.open( '/needs/tagged/' + this._id, windowName, 'height=' + constants.chatHeight + ',width=' + constants.chatWidth + ',left=' + window.innerWidth );
    return false;
  }

  var openTagConversations = Session.get( 'openTagConversations' ) && Session.get( 'openTagConversations' ).slice() || [],
      index = openTagConversations.indexOf( this._id );

  if( index > -1 ) openTagConversations.splice( index, 1 );
  openTagConversations.unshift( this._id );
 
  Session.set( 'openTagConversations', openTagConversations );
  Meteor.call( 'joinTagChat', this._id );
  
  
    
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

function closeTagChat() {
  var sourceId = this.toString();
  Meteor.call( 'leaveTagChat', sourceId );
  Meteor.call( 'stopTypingTagChat', sourceId );

  var openTagConversations = Session.get( 'openTagConversations' ).slice(),
      index = openTagConversations.indexOf( sourceId );

  if( index > -1 ) openTagConversations.splice( index, 1 );
  Session.set( 'openTagConversations', openTagConversations );
}


var previousNeedTitles, previousResourceValues;

Template.needs.onRendered( onRendered );

function onRendered() {
  Tracker.autorun( function(){

    var currentNeedTitles = [],
        prevNeedTitles = previousNeedTitles ? previousNeedTitles.slice() : [];

    var currentResourceValues = [],
        prevResourceValues = previousResourceValues ? previousResourceValues.slice() : [];

    Needs.find( { snapshot: { $exists: false } } ).forEach( registerNeedName );

    Resources.find( { snapshot: { $exists: false } } ).forEach( registerResourceValue );

    if( previousNeedTitles && currentNeedTitles.length > previousNeedTitles.length ) {
      playSound( 'pop1' ); // new need
      console.log ('PLAYSOUND pop1 (new need)');
    }

    if( prevNeedTitles.length ) {
      playSound( 'snare' ); // changed need
      console.log ('PLAYSOUND snare (changed need)');
    }
    
    if( previousResourceValues && currentResourceValues.length > previousResourceValues.length ) {
      playSound( 'pop2' ); // new resource      
      console.log ('PLAYSOUND pop2 (new resource)');
    }

    

    previousNeedTitles = currentNeedTitles;
    previousResourceValues = currentResourceValues;


    function registerNeedName( need ) {
      var title = need.title,
          index;

      currentNeedTitles.push( title );
      index = prevNeedTitles.indexOf( title );
      if( index > -1 ) {
        prevNeedTitles.splice( index, 1 );
      }
    }
    
    function registerResourceValue( resource ) {
      var value = resource.value,
          index;

      currentResourceValues.push( value );
      index = prevResourceValues.indexOf( value );
      if( index > -1 ) {
        prevResourceValues.splice( index, 1 );
      }
    }
    
    
    
  } );
}




// JF 2016-04-24
// returns ids of needs with the specified tags. excludes the specified user from the results.
function getTagNeedIDs( tags, userid ) {

    var tempTags = tags;

    if (tempTags.length < 1) { 
        return null;
    } else {
        
        // find other needs with the same tag(s) 

        var tempNeedUserId = userid;
        var selector1 = {snapshot: { $exists: false } };
                        // check only for needs tagged by OTHER users
        var selector2 =  {createdBy: {$ne: tempNeedUserId}};
        var selector3 = {tags: {$in:tempTags}};
        
                        // return only the field _id 
        var options = {fields: {_id: 1}};
        
        var tempNeedsWithSameTag = Needs.find( { $and: [selector1, selector2, selector3]}, options);
        //var tempNeedsWithSameTag = Needs.find( { $and: [selector1, selector2, selector3]});
        
        //var htmlString;

        // console.log ("---getTagNeedIDs---")
        // console.log ("tempTags: ".concat(tempTags));

        var countNeedIDs = 0;
        var userNames = '';
        var needIDsArray = [];
           
        tempNeedsWithSameTag.forEach(function(doc){
        
            var tempNeedId = doc._id;            
                        
            needIDsArray.push(tempNeedId);
                
            countNeedIDs = countNeedIDs+1;
            // console.log ("Need ID: ".concat(tempNeedId));
            
        });
        
        if (countNeedIDs > 0) {
            
            // no double needIDs
            needIDsArray = _.uniq(needIDsArray);
                        
            return needIDsArray;
        } else {
            return null;
        }
    }
}
// /JF



