var chatWindows = {};

// JF 2016-04-12
// feedlist = new Meteor.Collection("feedlist");
// /JF

Template.needs.events( {
  "keyup input[name=need]": keyupNeedInput,
  'focus [contentEditable=true]': editableFocusHandler,
  'blur [contentEditable=true]': editableBlurHandler,
  //JF commented out: 'click #needlist > .resource': clickAddResource,
  'click .need .resourceButton': clickAddResourceToNeed,
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
  },
  // 2016-09-29
  isAllowedToSeeResource:  function() {
  // only show a resource if you created it, or if you created its source need
  
    // console.log("--- isAllowedToSeeResource --- ");
    
    var user = Meteor.users.findOne( { _id: Meteor.userId() } ),
        userId = user.pretend || user._id; // userId is current (pretend) userId
    
    if ( this.createdBy === userId ) { // return true if you created the resource
        return true;
    }
    
    if ( Needs.findOne({_id:this.sourceId}).createdBy === userId ) { // return true if you created the source need
        return true; 
    }
    
    return false; // in all other cases: return false

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
  
    /*
  
                                    // JF 2016-09-16 on devices with a mobile screen ( <800 px), only return the first 50 needs
    if (screen.width < 800) {
    
        var user = Meteor.users.findOne( { _id: Meteor.userId() } ),
            userId = user.pretend || user._id;
      
        var numberOfOwnNeeds = Needs.find( { snapshot: { $exists: false } }, {createdBy: userId ).count();

        console.log("numberOfOwnNeeds: "+numberOfOwnNeeds);
        
        var temp
                                                                                // JF 2016-09-16 added limit:50 
        return Needs.find( { snapshot: { $exists: false } }, { sort: { created: -1 }, limit:50 } );
    } else {
        return Needs.find( { snapshot: { $exists: false } }, { sort: { created: -1 } } );
    }
    */
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
  
  // JF 2016-09-17
  , 
  currentUserNeed: function() {
    
    var user = Meteor.users.findOne( { _id: Meteor.userId() } ),
        userId = user.pretend || user._id; // userId is current (pretend) userId
        
    var userNeed = Needs.findOne( { createdBy:userId, $and: [ { "snapshot": {$exists: false} } ] } );
    
    if (userNeed) {
      return userNeed.title;
    } else {
      return "";
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
  
  isNotNullOrEmpty:  function(value) {

    // console.log('isNotNullOrEmpty value: ',value);

    if (value == null ) return false;
    
    if (value.length == 0) return false;
    
    return true;
        
  },
  
  // 2016-10-03 hack to avoid double text in contenteditable (see https://github.com/Swavek/contenteditable )
  // placeholder="&nbsp;" is workaround for issue where cursor jumps to to of need when field is empty
  editableTextTags: function () {
  
  return '<span class="need-tags" contenteditable="true" placeholder="&nbsp;" id="need-tags" >' + this.textTags + '</span>';   

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
        // JF-2016-09-28 var userNames = '';
        var userIDsArray = [];
        // JF-2016-09-28 var userNamesArray = [];
           
        tempNeedsWithSameTag.forEach(function(doc){
        
            // convert userId to userName
            var tempUserId = doc.createdBy;            
            // JF-2016-09-28 var tempUser = Meteor.users.findOne( { _id: tempUserId} );
            // JF-2016-09-28 var tempUserName = tempUser ? tempUser.username : tempUser;
 
            // console.log('UserID: '+doc.createdBy + '- Username:' +tempUserName);
                        
            userIDsArray.push(tempUserId);
            // JF-2016-09-28 userNamesArray.push(tempUserName);
                
            countUsernames = countUsernames+1;
            
        });
        
        if (countUsernames > 0) {
            
            // no double usernames
            userIDsArray = _.uniq(userIDsArray);
            // JF-2016-09-28 userNamesArray = _.uniq(userNamesArray);
                        
            return userIDsArray;
        } else {
            return null;
        }
    }
  
  },
  // /JF

  // JF 2016-08-24
  NeedChatNotification: function (need) {
  
      // if current user did not create this need, or if there is nobody in a chat for this need: return right now
      if ( (need.createdBy !== Meteor.userId()) || (need.inChat.length < 1) ) {
        return false;
        
      } else {
            // console.log('---- NeedChatNotification: need.createdBy: '+need.createdBy);
            // console.log('       need.inChat.includes(Meteor.userId)):  '+need.inChat.includes(Meteor.userId()));
            
          // is current user not in this chat? then he should be notified that someone opened a chat with him, i.e. return true
          if (need.inChat.includes(Meteor.userId()) === false) {
             return true;
          } else {
             return false;
          }
          
      }
         
  }
  // /JF
  
  
} );




Template.need.events( {
    
  // After pressing ENTER in a need title, put focus on the top need input field.
  // By not allowing enter characters in the title, we also prevent the known bug with contenteditable and enter that causes text duplication 
  'keydown .need-title': function(event) {
  
    // console.log("-------- keypress .need-title- event.which: "+event.which);

    if(event.which === 13) 
    {
        var nextItem = $(this).next('input');

        // console.log("-------- nextItem: " + nextItem);
        
        if( nextItem.size() === 0 ) {
            nextItem = $('input').eq(0);
            // console.log("-------- nextItem: " + nextItem);
        }
        
        nextItem.focus();
        
        return false;
    }
  },    

  // 2016-10-03 obviously copy-pasted from above, this prevents enters in the tags field
  'keydown .need-tags': function(event) {
  
    // console.log("-------- keypress .need-title- event.which: "+event.which);

    if(event.which === 13) 
    {
        var nextItem = $(this).next('input');

        // console.log("-------- nextItem: " + nextItem);
        
        if( nextItem.size() === 0 ) {
            nextItem = $('input').eq(0);
            // console.log("-------- nextItem: " + nextItem);
        }
        
        nextItem.focus();
        
        return false;
    }
  },    



// JF: orginal line was:  'click li.need': openChat,
// instead of this, only open a chat when clicked on the NAME:
//  'click li.need .name': openChat,
  
  /* JF 2016-08-25 Commented this out for Groningen by Edits request
  //  to disable opening chats by clicking on the user names altogether
  'click li.need .name': openChat,
  */ // /JF 2016-08-25
  
  'click li.need [contentEditable=true]': function() {
    return false;},
    
  // JF added:  
  'click .resourceButton': clickAddResourceToNeed,
  // /JF

  // JF 2016-04-18
  // 'click li.need .tags': clickNeedTags
   // /JF
  'click .taglink': openTagChat,
  
    // 2016-10-03
  'click .need-title': function (event) {
    var textTagsField = event.target.nextElementSibling;
    
    textTagsField.focus();
    
    setEndOfContenteditable(textTagsField); // puts the cursor at the end of the text
    
    // this is really dirty, the intention was to put the focus on the field containing the "textTags", i.e. "need-tags"
    // This works, but I still need to find a neater way to directly find that field instead of using nextElementSibling

    /* 
    console.log('clicked need title ', this.title);
    console.log('$(this)', $(this));
    console.log('this', this);

    // console.log('this.children()', this.children());
    // console.log('this.find("need-tags")', this.find('need-tags'));

    console.log('event ', event);
    
    // console.log('$(this).closest("need") ', $(this).closest('need') );    
    
    console.log('$(event.target).closest("need") ', $(event.target.parentNode).find('need-tags') );
    
    console.log('TEST ', $(this).closest('.need').children('.need-tags'));
    

    // console.log('event.target.parentElement.find("need-tags") ', event.target.parentElement.find('need-tags') );
    console.log('event.target.parentElement.children("need-tags") ', event.target.parentElement.children('need-tags') );


    console.log('$(this).find("need-tags")', $(this).find('#need-tags'));

    console.log('$("#need-tags")', $('#need-tags'));

    console.log('$(this).children()', $(this).children());


    
        
    $(this).$('#need-tags').focus();
    
    //$(this).next('need-tags').focus;
    

    // $(this).find('need-tags').focus;
    */
    
   }
  //

  
  
} );

Template.resource.events( {

  // After pressing ENTER in a resource title, put focus on the top need input field.
  // By not allowing enter characters in the title, we also prevent the known bug with contenteditable and enter that causes text duplication 
  'keydown .resource-title': function(event) {
  
    // console.log("-------- keypress .resource-title- event.which: "+event.which);

    if(event.which === 13) 
    {
        var nextItem = $(this).next('input');

        // console.log("-------- nextItem: " + nextItem);
        
        if( nextItem.size() === 0 ) {
            nextItem = $('input').eq(0);
            // console.log("-------- nextItem: " + nextItem);
        }
        
        nextItem.focus();
        
        return false;
    }
  },
  
  /* JF 2016-08-25 Commented this out for Groningen by Edits request
  //  to disable opening chats by clicking on the user names altogether
  
  
  // JF 2016-08-24 by clicking on a username in a resource connected to a need, we start a needchat
  'click .name': function(event) {
  
    console.log("-------- click .name"); 
    // console.log("-------- click li.resource .name - Needs.findOne( {_id:this.sourceId} )._id : "+Needs.findOne( {_id:event.sourceId} )._id );
    console.log("          event.type: "+event.type);
    console.log("          this._id: "+this._id);
    
    // openChat( Needs.findOne( {_id:this.sourceId} ) );
    
    openChatByNeed (Needs.findOne( {_id:this.sourceId} ) );
  }  
  */ // /JF 2016-08-25

  
  
} );


Template.chatcollection.events( {
  'click .close': closeChat,
  'click .tagclose': closeTagChat
  
} );

function keyupNeedInput( event ) {
  var value = event.target.value,
      split, description;
      
  //JF 2016-09-17
  var user = Meteor.users.findOne( { _id: Meteor.userId() } ),
      userId = user.pretend || user._id; // userId is current (pretend) userId
  ///JF
      
  if( event.keyCode !== 13 ) {
    if( value ) {
      // event.target.parentNode.querySelector( '.resourceButton' ).style = 'display: inherit';
      // 2016-05-29 to hide the resource button (by Edits request)
      event.target.parentNode.querySelector( '.resourceButton' ).style = 'display: none';
    } else event.target.parentNode.querySelector( '.resourceButton' ).style = 'display: none';
    return;
  }

  if( !value ) return;


  console.log("-------- keyupNeedInput 2 - value: "+value);

  // JF 2016-09-17 Only allow 1 need per user, no need to clear the value anymore, so outcommented the next line 
  // event.target.value = '';
  // /JF
  event.target.parentNode.querySelector( '.resourceButton' ).style = 'display: none';

  // JF 2016-09-17 Only allow 1 need per user
  //var userNeed = Needs.findOne( { createdBy:userId }, { snapshot: { $exists: false } } );
  var userNeed = Needs.findOne( { createdBy:userId, $and: [ { "snapshot": {$exists: false} } ] } );

  if (userNeed) { 
    // user already entered a need, so now we change its title
    console.log ("user already entered a need, so now we change its title to "+value);
    Meteor.call( 'changeNeedTitle', userNeed._id, value );
  } else {
    // user has not entered a need yet, so now we will create one
    console.log ("user has not entered a need yet, so now we will create one with title "+value);
    Meteor.call( 'addNeed', value );
  }
  // JF
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

  // JF 2016-08-21
  // NOTE: this only actually opens a chat if either you posted this need yourself, or if you posted a response to the need
  
  // console.log ("---------openChat---------");
  // console.log ("         Current need");
  // console.log ("         this._id: "+  this._id);
  // console.log ("         this.title: "+  this.title);
  // console.log ("         this.createdBy: "+  this.createdBy);
  
  /* JF 2016-08-25 disabling this check for Groningen, as the 'R'esource button in needs is also hidden now, users cannot post resources
     // so with this check disabled anyone can open a chat now
  
  var user = Meteor.users.findOne( { _id: Meteor.userId() } ),
      userId = user.pretend || user._id;
  // console.log ("         userId: "+  userId);
  
  // do NOT proceed if: 
  //                    You did not create this need 
  //                                AND 
  //                    You did not respond to it
  
  if ( (this.createdBy !== userId) && (Resources.find( { sourceId: this._id }, {createdBy: userId} ).count() === 0) ) {
    
    console.log ("         User did not post this need neither did he respond to it, so no chat is opened");
    return false;
  
  };
  // /JF 2016-08-21
  
  */ // / JF 2016-08-25
  

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


// JF 2016-08-24
function openChatByNeed( need ) {

  // JF 2016-08-21
  // NOTE: this only actually opens a chat if either you posted this need yourself, or if you posted a response to the need
  
  // console.log ("---------openChat---------");
  // console.log ("         Current need");
  // console.log ("         this._id: "+  this._id);
  // console.log ("         this.title: "+  this.title);
  // console.log ("         this.createdBy: "+  this.createdBy);
  
  
  var user = Meteor.users.findOne( { _id: Meteor.userId() } ),
      userId = user.pretend || user._id;
  // console.log ("         userId: "+  userId);
  
  // do NOT proceed if: 
  //                    You did not create this need 
  //                                AND 
  //                    You did not respond to it
  
  if ( (need.createdBy !== userId) && (Resources.find( { sourceId: need._id }, {createdBy: userId} ).count() === 0) ) {
    
    // console.log ("         User did not post this need neither did he respond to it, so no chat is opened");
    return false;
  
  };
  // /JF 2016-08-21
  
  
  

  if( isAllowed( 'separate windows' ) ) {
    var windowName = need.title;

    chatWindows[ windowName ] = window.open( '/needs/' + need._id, windowName, 'height=' + constants.chatHeight + ',width=' + constants.chatWidth + ',left=' + window.innerWidth );
    return false;
  }


  var openConversations = Session.get( 'openConversations' ) && Session.get( 'openConversations' ).slice() || [],
      index = openConversations.indexOf( need._id );

  if( index > -1 ) openConversations.splice( index, 1 );
  openConversations.unshift( need._id );

  Session.set( 'openConversations', openConversations );
  Meteor.call( 'joinChat', need._id );
}
// /JF 2016-08-24




function openTagChat( event ) {


  // console.log ("---------openTagChat---------");
  // console.log ("this._id: "+  this._id);
  

  // JF 2016-08-22 TagChatRoom
                                // get tagchatrooms that have the tag(s) used in this need
                                // if there is no tagchatroom yet with this tag, it is created
  var TagChatRoomsToBeOpened = getTagChatRooms(this._id); 
  
  console.log ("TagChatRoomsToBeOpened: ");
  
  // for each tagchatroom:
  TagChatRoomsToBeOpened.forEach(function(tcroom){
     
    // console.log("--------- Opening TagChatRoom id:"+tcroom._id+" title:"+tcroom.title);


    Meteor.call( 'updateAutogeneratedTagChatMessages', tcroom._id );

    if( isAllowed( 'separate windows' ) ) {
      var windowName = this.title;

      chatWindows[ windowName ] = window.open( '/needs/tagged/' + tcroom._id, windowName, 'height=' + constants.chatHeight + ',width=' + constants.chatWidth + ',left=' + window.innerWidth );
      return false;
    }

    var openTagConversations = Session.get( 'openTagConversations' ) && Session.get( 'openTagConversations' ).slice() || [],
        index = openTagConversations.indexOf( tcroom._id );

    if( index > -1 ) openTagConversations.splice( index, 1 );
    openTagConversations.unshift( tcroom._id );
     
    Session.set( 'openTagConversations', openTagConversations );
    Meteor.call( 'joinTagChat', tcroom._id );
     
  });
  

    
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




  
// JF 2016-08-19
// this is to ensure that there is only 1 tagchat per tag, not a different tagchat per tagged need
// we use the oldest need as the "unified" tagchat need
// 2016-08-22: CAN BE REMOVED, superseeded by TagChatRooms


function getUnifiedTagChatNeed( needSourceId ) {

  // console.log ("-------- getUnifiedTagChatNeed (" + needSourceId + ")" );

  //tags attached to this Need
  var tempTags = Needs.findOne( {_id: needSourceId} ).tags;
    
  if (tempTags.length < 1) { 
      return null;
  } else {
        
      // find other needs with the same tag(s) ordered by creation datetime, limted to 1, i.e. only the oldest
      var selector1 = {snapshot: { $exists: false } };
      var selector2 = {tags: {$in:tempTags}};
      
      var tempNeedsWithSameTag = Needs.findOne( { $and: [selector1, selector2]}, {sort:{created:1}} );

      UnifiedTagChatNeed = tempNeedsWithSameTag;
            
      // console.log ("UnifiedTagChatNeed._id: " + UnifiedTagChatNeed._id);

      return UnifiedTagChatNeed;
    
  }      

}
// / JF 2016-08-19



// JF 2016-08-22 TagChatRoom
// 2016-08-22: CAN BE REMOVED, superseeded by TagChatRooms

// find existing TagChatRoom with the FIRST tag of the need
// if such a chatroom doesn't exist yet, create it.

// Note: still must be adapted for needs with MULTIPLE tags


function getTagChatRoom( needSourceId ) {

  // console.log ("-------- getTagChatRoom (" + needSourceId + ")" );

  //tags attached to this Need
  var tempTags = Needs.findOne( {_id: needSourceId} ).tags;
  
    
  if (tempTags.length < 1) { 
      return null;
  } else {
  
      // find existing TagChatRoom with this tag
      // if it doesn't exist yet, create it.
        
      // find other tagchatrooms with the same tag(s) ordered by creation datetime, limted to 1, i.e. only the oldest
      var selector1 = {snapshot: { $exists: false } };
      var selector2 = {title: tempTags[0]};
      
      tempTagChatRoomsWithSameTag = TagChatRooms.findOne( { $and: [selector1, selector2]}, {sort:{created:1}} );
      
      if (tempTagChatRoomsWithSameTag == null)
      
        {
              // console.log ("        tempTagChatRoomsWithSameTag == null");
        
              // console.log ("        addTagChatRoom(" + tempTags[0] + ")" );
              Meteor.call ('addTagChatRoom', tempTags[0]);
              
              tempTagChatRoomsWithSameTag = TagChatRooms.findOne( { $and: [selector1, selector2]}, {sort:{created:1}} );
        }


            
      // console.log ("getTagChatRoom._id: " + tempTagChatRoomsWithSameTag._id);

      return tempTagChatRoomsWithSameTag;
    
  }      

}
// / JF 2016-08-22





// JF 2016-08-22 TagChatRooms

// find existing TagChatRooms with the tags of the need
// if such TagChatRooms don't exist yet, create them.

// returns: all TagChatRooms with tags of the need

function getTagChatRooms( needSourceId ) {

  // console.log ("-------- getTagChatRooms (" + needSourceId + ")" );

  //tags attached to this Need
  var tempTags = Needs.findOne( {_id: needSourceId} ).tags;

  var tempTagChatRooms;
  
    
  if (tempTags.length < 1) { 
      return null;
  } else {
  
      // do for each tag:
          // find existing TagChatRoom with this tag
          // if it doesn't exist yet, create it.
          
      for (var i=0; i < tempTags.length; i++) 
      
      {
          var selector1 = {snapshot: { $exists: false } };
          var selector2 = {title: tempTags[i]};

          // console.log("        tempTags[i]: "+tempTags[i]);   
                 
          // find tagchatroom with the same tag
          tempTagChatRoomsWithSameTag = TagChatRooms.findOne( { $and: [selector1, selector2]}, {sort:{created:1}} );
          
          if (tempTagChatRoomsWithSameTag == null)
          
            {
                  // console.log ("        tempTagChatRoomsWithSameTag == null");
            
                  // console.log ("        addTagChatRoom(" + tempTags[i] + ")" );
                  Meteor.call ('addTagChatRoom', tempTags[i]);
                  
                  tempTagChatRoomsWithSameTag = TagChatRooms.findOne( { $and: [selector1, selector2]}, {sort:{created:1}} );
            }
            
           // console.log ("getTagChatRooms._id: " + tempTagChatRoomsWithSameTag._id);

            
       }

      // now just find the TagChatRooms with the tags from the need, and return them
      var selector1 = {snapshot: { $exists: false } };
      var selector2 = {title: {$in:tempTags}};
      
      var tempTagChatRoomsWithSameTag = TagChatRooms.find( { $and: [selector1, selector2]}, {sort:{created:1}} );
        
      return tempTagChatRoomsWithSameTag;
    
  }      

}
// / JF 2016-08-22



function setEndOfContenteditable(contentEditableElement)
{
    var range,selection;
    if(document.createRange)//Firefox, Chrome, Opera, Safari, IE 9+
    {
        range = document.createRange();//Create a range (a range is a like the selection but invisible)
        range.selectNodeContents(contentEditableElement);//Select the entire contents of the element with the range
        range.collapse(false);//collapse the range to the end point. false means collapse to end rather than the start
        selection = window.getSelection();//get the selection object (allows you to change selection)
        selection.removeAllRanges();//remove any selections already made
        selection.addRange(range);//make the range you have just created the visible selection
    }
    else if(document.selection)//IE 8 and lower
    { 
        range = document.body.createTextRange();//Create a range (a range is a like the selection but invisible)
        range.moveToElementText(contentEditableElement);//Select the entire contents of the element with the range
        range.collapse(false);//collapse the range to the end point. false means collapse to end rather than the start
        range.select();//Select the range (make it the visible selection
    }
}
