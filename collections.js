Needs = new Mongo.Collection( 'needs' );

ChatMessages = new Mongo.Collection( 'chatmessages' );

// JF 2016-04-22
TagChatMessages = new Mongo.Collection( 'tagchatmessages' );
// /JF 

// JF 2016-08-22
TagChatRooms = new Mongo.Collection( 'tagchatrooms' );
// /JF 2016-08-22 


Resources = new Mongo.Collection( 'resources' );

Roles = new Mongo.Collection( 'roles' );

Snapshots = new Mongo.Collection( 'snapshots' );

permissions = [
  'post needs',
  'needs multicolumn',
  'post chatmessages',
  'post resources',
  'edit roles',
  'edit users',
  'edit needs',
  'edit chatmessages',
  'edit resources',
  'edit snapshots',
  'pretend',
  'separate windows',
  'start videochat'
];

Meteor.methods({
  addNeed: function( title ) {
    var user = Meteor.users.findOne( { _id: Meteor.userId() } ),
        userId = user.pretend || user._id;
        
    user = Meteor.users.findOne( { _id: userId } );
        

    if( !isAllowed( 'post needs' ) ) throw new Meteor.Error( 'not-authorized' );

    console.log ("------addNeed ("+ title +") -------");

    var need = new Need( { title: title, createdBy: userId} ),
        nId = Needs.insert( need );

    /* 2016-10-03 disabling entering tags in input field
    // JF 2016-04-18
    var tagsArray = title.match(/#\S+/g);  // make an array with all the hashtags e.g ['#tag1', '#tag2']    

    // JF
    Needs.update ( { _id: nId }, { $set: { tags: tagsArray, state: 'initial', createdByUsername: user.username, createdByAvatar: user.avatar } } );
    // /JF
    */
    Needs.update ( { _id: nId }, { $set: { tags: [], state: 'initial', createdByUsername: user.username, createdByAvatar: user.avatar } } );
    
    // JF 2016-09-29
    // Needs.update ( { _id: nId }, { $set: { createdByUsername: user.username, createdByAvatar: user.avatar } } );
    //
    
    // JF 2016-04-18
    // var tagsArray = title.match(/#\S+/g);  // make an array with all the hashtags e.g ['#tag1', '#tag2']    
    // Needs.update( { _id: nId }, { $set: { tags: tagsArray } } );
    // /JF
    
    // 2016-09-29
    
    /* 2016-10-03 disabling entering tags in input field        
    Meteor.call( 'changeNeedTagUsers', nId, tagsArray ); // updates the tagUsers, i.e. list of other users with the same tag(s) in their need.
    */
    
    Meteor.call( 'addChatMessage', { text: need.title, sourceId: nId } );
  },
  deleteNeed: function( needId ) {
    if ( !isAllowed( 'edit needs' ) ) throw new Meteor.Error( 'not-authorized' );

    Needs.remove( needId );
    ChatMessages.remove( { sourceId: needId } );
  },
  changeNeedOwner: function( needId, newOwnerId ) {
    if( !isAllowed( 'edit needs') ) throw new Meteor.Error( 'not-authorized' );

    // jf 2016-09-29
    var user = Meteor.users.findOne( { _id: newOwnerId } );

    // jf 2016-09-29 Needs.update( { _id: needId }, { $set: { createdBy: newOwnerId } } );
    Needs.update( { _id: needId }, { $set: { createdBy: newOwnerId, createdByUsername: user.username, createdByAvatar: user.avatar  } } );
    ChatMessages.update( { sourceId: needId }, { $set: { createdBy: newOwnerId } } );
  },
  changeNeedTitle: function( needId, title ) {
    // 2016-09-17 JF commented this line out, as part of the new "one need per person" scheme, where editing your own need in the need input field is ALWAYS allowed
    // if( !isAllowed( 'edit needs' ) ) throw new Meteor.Error( 'not-authorized' );
    // /JF 

    Needs.update( { _id: needId }, { $set: { title: title } } );
        
    // JF
    Needs.update( { _id: needId }, { $set: { title: title, state: 'titleChanged' } } );
    // /JF
    
    /* JF 2016-10-03 disabling tagging from directly in the need title, there is now a separate "textTags" field for this
    
    // JF 2016-04-18
    var tagsArray = title.match(/#\S+/g);  // make an array with all the hashtags e.g ['#tag1', '#tag2']    
    Needs.update( { _id: needId }, { $set: { tags: tagsArray } } );
    // /JF

    // 2016-09-29
    Meteor.call( 'changeNeedTagUsers', needId, tagsArray );

    */    
  },
  changeNeedCreated: function( needId, created ) {
    if( !isAllowed( 'edit needs' ) ) throw new Meteor.Error( 'not-authorized' );

    Needs.update( { _id: needId }, { $set: { created: created } } );
    ChatMessages.update( { sourceId: needId }, { $set: { created: created } } );
  },
  
  // Each NeedState should be represented by a different color
  // state: 'initial', 'titleChanged', 'sentToRepository', 'matched'
  changeNeedState: function( needId, state ) {
    if( !isAllowed( 'edit needs' ) ) throw new Meteor.Error( 'not-authorized' );

    Needs.update( { _id: needId }, { $set: { state: state } } );
  },
  // /JF
  
  // 2016-10-03 
  changeNeedTextTags: function( needId, textTags ) {
  
    // if (textTags == '') {textTags = '#';} // prevents duplicate text bug in contenteditable // jf: actually fixed by placeholder = "&nbsp;"

    Needs.update( { _id: needId }, { $set: { textTags: textTags } } );
    
    var tagsArray = textTags.match(/#\S+/g);  // make an array with all the hashtags e.g ['#tag1', '#tag2']    
    Needs.update( { _id: needId }, { $set: { tags: tagsArray } } );
  
      Meteor.call( 'changeNeedTagUsers', needId, tagsArray );
    
  },

  // JF 2016-09-29
  changeNeedTagUsers: function( needId, newTags ) {
  
      // This is a bit complicated as a result of including denormalized user data i.e. user name and avatar instead of just user id
  
      var tempTagUserObject, 
          tempTagUserArray;
      
      newTags = newTags || [];
       
      // tagUsers: [userid, username, avatar]

      console.log ('-----changeNeedTags------');
      console.log ('needId: ',needId);
      console.log ('newTags: ',newTags);

      // 1. Search for other needs that we must DELETE this taguser from, i.e.:
      
      //    Search all needs that have this taguser in its list of tagusers AND that don't have any of the new tags in its list of tags.
      //    For each found need: delete this taguser from the need.
      
      var tagUserID = Needs.findOne ( {_id: needId} ).createdBy,
          tagUser = Meteor.users.findOne( { _id: tagUserID } );
          
          tagUserDenormalized = {userid: tagUser._id, username: tagUser.username, avatar: tagUser.avatar};

      var selector1 = {snapshot: { $exists: false } };                       
      var selector2 = {createdBy: {$ne: tagUserID}}; // check only for needs tagged by OTHER users
      // var selector3 = {tagUsers: {$in:[tagUserID]}};
      var selector3 = {"tagUsers.userid": {$in:[tagUserID]}};
      var selector4 = {tags: {$not: {$in:newTags} }};

                        
      //var options = {fields: {_id: 1}}; // return only the field _id 
      // var tempNeedsWithTagUser = Needs.find( { $and: [selector1, selector2, selector3]}, options);      
      
      var tempNeedsWithTagUser = Needs.find( { $and: [selector1, selector2, selector3, selector4]});      
      
      tempNeedsWithTagUser.forEach(function(doc){
        console.log ('-----changeNeedTags - removing taguser ',tagUser.username,' from: ',doc.title);
        
        tempTagUserArray = doc.tagUsers;
        
        console.log ('-----changeNeedTags - tempTagUserArray: ',tempTagUserArray);
        
        
        // tempTagUserObject = doc.tagUsers.find(function(a) {return a.userid === tagUserID; });
        
        Needs.update( { _id: doc._id }, {
          // $pull: { "tagUsers": tempTagUserObject }
          
          // $pull: { tagUsers: { $elemMatch: {userid: tagUserID} } }
          $pull: { tagUsers: {userid: tagUserID} }
          } );
        
      
      });

      // 2. search for other needs that we must ADD this taguser to, i.e.:
      
      //    Search all other needs that have one of the newly specified tags AND the taguser is not already in its list of tagusers.
      //    For each found need:  add the taguser.
        
       
      selector1 = {snapshot: { $exists: false } };                       
      selector2 = {createdBy: {$ne: tagUserID}}; // check only for needs tagged by OTHER users
      // selector3 = {tagUsers: { $not: {$in:[tagUserID]} } }; 
      selector3 = {"tagUsers.userid": { $not: {$in:[tagUserID]} } }; 
      selector4 = {tags: {$in:newTags}};
                  
      var tempNeedsWithoutTagUser = Needs.find( { $and: [selector1, selector2, selector3, selector4]});      
      
      tempNeedsWithoutTagUser.forEach(function(doc){
        console.log ('-----changeNeedTags - adding taguser to :', doc.title);
        
        Needs.update( { _id: doc._id }, {
          // $addToSet: { tagUsers: tagUserID }
          $addToSet: { tagUsers: tagUserDenormalized }
        } );

      
      });
      
      // 3. Now handle the CURRENT need: 
      //    Clear the current tagusers from the current need, 
      //    find tagusers that match the new tags, and add them to the current need

      Needs.update( { _id: needId }, { $unset: {tagUsers: ""} } ); // clear all current tagUsers
     
      selector1 = {snapshot: { $exists: false } };                       
      selector2 = {createdBy: {$ne: tagUserID}}; // check only for needs created by OTHER users
      selector3 = {tags: {$in:newTags}};         // with the same tags
     
      var options = {fields: {createdBy: 1}}; // return only the field createdBy 
     
      var tempUserIDsWithSameTag = Needs.find( { $and: [selector1, selector2, selector3]}, options);       
     
      tempUserIDsWithSameTag.forEach(function(doc){
          var tempUser = Meteor.users.findOne( { _id: doc.createdBy } );
      
          Needs.update( { _id: needId }, {
            // $addToSet: { tagUsers: doc.createdBy }
          $addToSet: { tagUsers: {userid: tempUser._id, username: tempUser.username, avatar: tempUser.avatar} }
          } );
      });
      
      
        
  
  },
  
  // JF 2016-08-22 TagChatRooms, code based on Needs
  
  // Title of a tagchatroom should be a single tag
  addTagChatRoom: function( title ) {

    console.log ("------addTagChatRoom ("+ title +") -------");


    var user = Meteor.users.findOne( { _id: Meteor.userId() } ),
        userId = user.pretend || user._id;

    // if( !isAllowed( 'post needs' ) ) throw new Meteor.Error( 'not-authorized' );

    var tagChatRoom = new TagChatRoom( { title: title, createdBy: userId } ),
        tId = TagChatRooms.insert( tagChatRoom );

    // JF
    TagChatRooms.update ( { _id: tId }, { $set: { state: 'initial' } } );
    // /JF
    
    // JF 2016-08-22 not relevant in the context of tagchatroom but whatever..
    // JF 2016-04-18
    var tagsArray = title.match(/#\S+/g);  // make an array with all the hashtags e.g ['#tag1', '#tag2']    
    TagChatRooms.update( { _id: tId }, { $set: { tags: tagsArray } } );
    // /JF
    

    // Meteor.call( 'addChatMessage', { text: need.title, sourceId: nId } );
  },
  deleteTagChatRoom: function( tagChatRoomId ) {
    // if ( !isAllowed( 'edit needs' ) ) throw new Meteor.Error( 'not-authorized' );

    TagChatRooms.remove( tagChatRoomId );
    TagChatMessages.remove( { sourceId: tagChatRoomId } );
  },
  deleteAllTagChatRooms: function( ) {
    // if ( !isAllowed( 'edit needs' ) ) throw new Meteor.Error( 'not-authorized' );

    TagChatRooms.remove( {} );
    TagChatMessages.remove( {} );
  },
  
  // JF we don't really care under which user the TagChatRoom was created, so I commented this out
  
  // changeNeedOwner: function( needId, newOwnerId ) {
  //  if( !isAllowed( 'edit needs') ) throw new Meteor.Error( 'not-authorized' );

  //  Needs.update( { _id: needId }, { $set: { createdBy: newOwnerId } } );
  //  ChatMessages.update( { sourceId: needId }, { $set: { createdBy: newOwnerId } } );
  //},

  // Title of a TagChatRoom should never be changed, as it's basically its identifier, but anyway...
  changeTagChatRoomTitle: function( tagChatRoomId, title ) {
    // if( !isAllowed( 'edit needs' ) ) throw new Meteor.Error( 'not-authorized' );

    TagChatRooms.update( { _id: tagChatRoomId }, { $set: { title: title } } );
        
    // JF
    TagChatRooms.update( { _id: tagChatRoomId }, { $set: { title: title, state: 'titleChanged' } } );
    // /JF
    
    // JF 2016-04-18
    var tagsArray = title.match(/#\S+/g);  // make an array with all the hashtags e.g ['#tag1', '#tag2']    
    TagChatRooms.update( { _id: needId }, { $set: { tags: tagsArray } } );
    // /JF
    
  },
  changeTagChatRoomCreated: function( tagChatRoomId, created ) {
    //if( !isAllowed( 'edit needs' ) ) throw new Meteor.Error( 'not-authorized' );

    TagChatRooms.update( { _id: tagChatRoomId }, { $set: { created: created } } );
    TagChatMessages.update( { sourceId: tagChatRoomId }, { $set: { created: created } } );
  },
  
  // JF we don't care about this for tagchatrooms either
  /*
  // Each NeedState should be represented by a different color
  // state: 'initial', 'titleChanged', 'sentToRepository', 'matched'
  changeNeedState: function( needId, state ) {
    if( !isAllowed( 'edit needs' ) ) throw new Meteor.Error( 'not-authorized' );

    Needs.update( { _id: needId }, { $set: { state: state } } );
  },
  */
  
  // / JF 2016-08-22 TagChatRooms
  

  addChatMessage: function( options ) {
    var user = Meteor.users.findOne( { _id: Meteor.userId() } );
    if ( !isAllowed( 'post chatmessages') ) throw new Meteor.Error( 'not-authorized' );

    ChatMessages.insert( new ChatMessage( { text: options.text, sourceId: options.sourceId, createdBy: user.pretend || user._id } ) );
  },
  deleteChatMessage: function( chatmessageId ) {
    if( !isAllowed( 'edit chatmessages' ) ) throw new Meteor.Error( 'not-authorized' );

    ChatMessages.remove( { _id: chatmessageId } );
  },
  changeChatMessageOwner: function( chatmessageId, newOwnerId ) {
    if( !isAllowed( 'edit chatmessages') ) throw new Meteor.Error( 'not-authorized' );

    ChatMessages.update( { _id: chatmessageId }, { $set: { createdBy: newOwnerId } } );
  },
  'changeChatMessageText': function( chatmessageId, text ) {
    if( !isAllowed( 'edit chatmessages') ) throw new Meteor.Error( 'not-authorized' );

    ChatMessages.update( { _id: chatmessageId }, { $set: { text: text } } );
  },
  changeChatMessageCreated: function( chatmessageId, created ) {
    if( !isAllowed( 'edit chatmessages' ) ) throw new Meteor.Error( 'not-authorized' );

    ChatMessages.update( { _id: chatmessageId }, { $set: { created: created } } );
  },

  
  
  // JF 2016-04-22 "TAGGED need chat messages"
  
  addTagChatMessage: function( options ) {
    var user = Meteor.users.findOne( { _id: Meteor.userId() } );
    if ( !isAllowed( 'post chatmessages') ) throw new Meteor.Error( 'not-authorized' );

    TagChatMessages.insert( new ChatMessage( { text: options.text, sourceId: options.sourceId, createdBy: user.pretend || user._id, autoGenerated: options.autoGenerated } ) );
  },
  deleteTagChatMessage: function( chatmessageId ) {
    if( !isAllowed( 'edit chatmessages' ) ) throw new Meteor.Error( 'not-authorized' );

    TagChatMessages.remove( { _id: chatmessageId } );
  },
  changeTagChatMessageOwner: function( chatmessageId, newOwnerId ) {
    if( !isAllowed( 'edit chatmessages') ) throw new Meteor.Error( 'not-authorized' );

    TagChatMessages.update( { _id: chatmessageId }, { $set: { createdBy: newOwnerId } } );
  },
  'changeTagChatMessageText': function( chatmessageId, text ) {
    if( !isAllowed( 'edit chatmessages') ) throw new Meteor.Error( 'not-authorized' );

    TagChatMessages.update( { _id: chatmessageId }, { $set: { text: text } } );
  },
  changeTagChatMessageCreated: function( chatmessageId, created ) {
    if( !isAllowed( 'edit chatmessages' ) ) throw new Meteor.Error( 'not-authorized' );

    TagChatMessages.update( { _id: chatmessageId }, { $set: { created: created } } );
  },
  updateAutogeneratedTagChatMessages: function( needSourceId ) {
  
    console.log ("------updateAutogeneratedTagChatMessages ("+ needSourceId +") -------");

    TagChatMessages.remove( { $and: [{ sourceId: needSourceId }, {autoGenerated:1}] } );
    
    var tempTags = TagChatRooms.findOne( {_id: needSourceId} ).tags;
    
    console.log ("Tags: " + tempTags.join(' '));

    // find IDs of needs with the same tag
    var tempNeeds = getTagNeeds (tempTags);
    
    for (index = 0; index < tempNeeds.length; ++index) {
    
        tempNeed=tempNeeds[index];
        
        tempId = TagChatMessages.insert( new ChatMessage( { text: tempNeed.title, sourceId: needSourceId, created: tempNeed.created, createdBy: tempNeed.createdBy, autoGenerated: 1 } ) );
                
        // JF 2016-08-18
        // We want to copy the "created" field from the originally posted need.
        
        // For some reason the above "created: tempNeed.created" in the insert did not work, it was set to current datetime anyway.
        // Therefore we're doing it via an update instead:
        TagChatMessages.update ( { _id: tempId}, { $set: { created: tempNeed.created } });

        // console.log ("TagChatMessages.insert: tempId= " + tempId);    
        console.log ("TagChatMessages.insert: " + tempNeed.title + " needSourceId:"+ needSourceId + " createdBy:" +  tempNeed.createdBy + " created:" + tempNeed.created );
    
    }
        

  },
  
  // / JF
    
  
  addResource: function( value, needId ) {
    if( !isAllowed( 'post resources') ) throw new Meteor.Error( 'not-authorized' );

    var user = Meteor.users.findOne( { _id: Meteor.userId() } ),
        userId = user.pretend || user._id;
        
    user = Meteor.users.findOne( { _id: userId } );

    Resources.insert( new Resource( { value: value, sourceId: needId, createdBy: user._id, createdByUsername: user.username, createdByAvatar: user.avatar } ) );
  },
  deleteResource: function( resourceId ) {
    if( !isAllowed( 'edit resources' ) ) throw new Meteor.Error( 'not-authorized' );

    Resources.remove( { _id: resourceId } );
  },
  changeResourceOwner: function( resourceId, newOwnerId ) {
    if( !isAllowed( 'edit resources') ) throw new Meteor.Error( 'not-authorized' );

    Resources.update( { _id: resourceId }, { $set: { createdBy: newOwnerId } } );
  },
  'changeResourceText': function( resourceId, text ) {
    if( !isAllowed( 'edit resources') ) throw new Meteor.Error( 'not-authorized' );

    Resources.update( { _id: resourceId }, { $set: { value: text } } );
  },
  changeResourceCreated: function( resourceId, created ) {
    if( !isAllowed( 'edit resources' ) ) throw new Meteor.Error( 'not-authorized' );

    Resources.update( { _id: resourceId }, { $set: { created: created } } );
  },
  joinChat: function( id ) {
    var user = Meteor.users.findOne( { _id: Meteor.userId() } );

    Needs.update( { _id: id }, {
      $addToSet: { inChat: user ? user.pretend || user._id : Meteor.userId() }
    } );
  },
  leaveChat: function( id ) {
    var user = Meteor.users.findOne( { _id: Meteor.userId() } );

    Needs.update( { _id: id }, {
      $pull: { inChat: user.pretend || user._id }
    } );
  },
  startTyping: function( id ) {
    var user = Meteor.users.findOne( { _id: Meteor.userId() } );

    Needs.update( { _id: id }, {
      $addToSet: { writingMessage: user.pretend || user._id }
    } );
  },
  stopTyping: function( id ) {
    var user = Meteor.users.findOne( { _id: Meteor.userId() } );

    Needs.update( { _id: id }, {
      $pull: { writingMessage: user.pretend || user._id }
    } );
  },

  /*
  // JF 2016-04-22 "Tagged needs chat" 
  joinTagChat: function( id ) {
    var user = Meteor.users.findOne( { _id: Meteor.userId() } );

    Needs.update( { _id: id }, {
      $addToSet: { inTagChat: user ? user.pretend || user._id : Meteor.userId() }
    } );
  },
  joinTagChatUser: function( needId, userId ) {
    
    var user = Meteor.users.findOne( { _id: userId } );

    Needs.update( { _id: needId }, {
      $addToSet: { inTagChat: userId }
    } );
  },  
  leaveTagChat: function( id ) {
    var user = Meteor.users.findOne( { _id: Meteor.userId() } );

    Needs.update( { _id: id }, {
      $pull: { inTagChat: user.pretend || user._id }
    } );
  },
  startTypingTagChat: function( id ) {
    var user = Meteor.users.findOne( { _id: Meteor.userId() } );

    Needs.update( { _id: id }, {
      $addToSet: { writingMessageTagChat: user.pretend || user._id }
    } );
  },
  stopTypingTagChat: function( id ) {
    var user = Meteor.users.findOne( { _id: Meteor.userId() } );

    Needs.update( { _id: id }, {
      $pull: { writingMessageTagChat: user.pretend || user._id }
    } );
  },
  // /JF
  */

  // JF 2016-08-22 TagChatRooms
  
  // JF 2016-04-22 "Tagged needs chat" 
  joinTagChat: function( id ) {
    var user = Meteor.users.findOne( { _id: Meteor.userId() } );

    TagChatRooms.update( { _id: id }, {
      $addToSet: { inTagChat: user ? user.pretend || user._id : Meteor.userId() }
    } );
  },
  joinTagChatUser: function( needId, userId ) {
    
    var user = Meteor.users.findOne( { _id: userId } );

    TagChatRooms.update( { _id: needId }, {
      $addToSet: { inTagChat: userId }
    } );
  },  
  leaveTagChat: function( id ) {
    var user = Meteor.users.findOne( { _id: Meteor.userId() } );

    TagChatRooms.update( { _id: id }, {
      $pull: { inTagChat: user.pretend || user._id }
    } );
  },
  startTypingTagChat: function( id ) {
    var user = Meteor.users.findOne( { _id: Meteor.userId() } );

    TagChatRooms.update( { _id: id }, {
      $addToSet: { writingMessageTagChat: user.pretend || user._id }
    } );
  },
  stopTypingTagChat: function( id ) {
    var user = Meteor.users.findOne( { _id: Meteor.userId() } );

    TagChatRooms.update( { _id: id }, {
      $pull: { writingMessageTagChat: user.pretend || user._id }
    } );
  },

  // /JF 2016-08-22 TagChatRooms

  
  
  updateRole: function( name, incomingPermissions ) {
    incomingPermissions = incomingPermissions || {};

    if( !isAllowed( 'edit roles' ) ) {
      throw( new Meteor.Error( 'not allowed', 'you are not allowed to edit roles' ) );
    }

    var instructions = {
          $set: {
            name: name,
            updated: new Date(),
            updatedBy: Meteor.userId()
          }
        },
        target = instructions.$set;

    Object.keys( incomingPermissions ).forEach( receivePermission );

    Roles.update( { name: name }, instructions, { upsert: true } );

    function receivePermission( key ) {
      if( permissions.indexOf( key ) > -1 ) target[ key ] = !!incomingPermissions[ key ];
    }
  },
  deleteRole: function( name ) {

    // check if role is in use, then don't delete
    var count = Meteor.users.find( { role: name } ).count();

    if ( count ) {
      throw( new Meteor.Error(
        'role is used',
        'the role ' + name + ' is currently assigned to ' + count + ' users'
      ) );
    }

    Roles.remove( {
      name: name
    } );
  },
  setUserRole: function( username, role ) {
    Meteor.users.update( { username: username }, { $set: {
      role: role
    } } );
  },

  setUserVideochatUrl: function( userId, url ) {
    Meteor.users.update( { _id: userId }, { $set: {
      videochaturl: url
    } } );
  },

  setUserEmail: function( userId, newEmail ) {
    Meteor.users.update( { _id: userId }, { $set: {
      email: newEmail
    } } );
  },


  // JF 2016-08-22 I haven't added the TagChatRooms to the snapshots yet...
  
  copyToSnapshot: function( name, source ) {
    var need,
        snapshot = new Snapshot( name ),
        resourceQuery = { sourceId: { $exists: false } },
        needQuery = {},
        snapshotId;

    Snapshots.update( { name: name }, { $set: snapshot }, { upsert: true } );

    snapshotId = Snapshots.findOne( { name: name } )._id;

    // copy needs
    if( source ) {
      needQuery.snapshot = source;
      resourceQuery.snapshot = source;
    } else {
      needQuery.snapshot = { $exists: false };
      resourceQuery.snapshot = { $exists: false };
    }

    Needs.find( needQuery ).forEach( copyNeed );
    Resources.find( resourceQuery ).forEach( copyResource );

    function copyNeed( need ) {
      var oldNeedId = need._id;

      delete need._id;
      need.snapshot = snapshotId;

      Needs.insert( need, copyChatMessagesAndResources );

      function copyChatMessagesAndResources( err, _id ) {
        ChatMessages.find( { sourceId: oldNeedId } ).forEach( copyChatMessage );
        // JF 2016-04-22 
        TagChatMessages.find( { sourceId: oldNeedId } ).forEach( copyTagChatMessage );
        // /JF
        Resources.find( { sourceId: oldNeedId } ).forEach( copyResource );

        function copyChatMessage( chatmessage ) {
          delete chatmessage._id;
          chatmessage.sourceId = _id;

          ChatMessages.insert( chatmessage );
        }

        // JF 2016-04-22
        function copyTagChatMessage( chatmessage ) {
          delete chatmessage._id;
          chatmessage.sourceId = _id;

          TagChatMessages.insert( chatmessage );
        }
        // /JF


        function copyResource( resource ) {
          delete resource._id;
          resource.sourceId = _id;

          Resources.insert( resource );
        }
      }
    }

    function copyResource( resource ) {
      var oldResourceId = resource._id;

      delete resource._id;
      resource.snapshot = snapshotId;

      Resources.insert( resource );
    }
  },
  loadSnapshot: function( name ) {
    if( name === 'current content' ) return;

    var snapshotId = Snapshots.findOne( { name: name } )._id;

    Needs.find( { snapshot: snapshotId } ).forEach( copyNeed );
    Resources.find( { snapshot: snapshotId } ).forEach( copyResource );

    function copyNeed( need ) {
      var oldNeedId = need._id;

      delete need._id;
      delete need.snapshot;

      return Needs.insert( need, copyChatMessages );

      function copyChatMessages( err, _id ) {
        ChatMessages.find( { sourceId : oldNeedId } ).forEach( copyChatmessage );
        // JF 2016-04-22 
        TagChatMessages.find( { sourceId: oldNeedId } ).forEach( copyTagChatMessage );
        // /JF
        Resources.find( { sourceId: oldNeedId } ).forEach( copyResource );

        function copyChatmessage( chatmessage ) {
          delete chatmessage._id;
          chatmessage.sourceId = _id;

          ChatMessages.insert( chatmessage );
        }

        // JF 2016-04-22
        function copyTagChatMessage( chatmessage ) {
          delete chatmessage._id;
          chatmessage.sourceId = _id;

          TagChatMessages.insert( chatmessage );
        }
        // /JF


        function copyResource( resource ) {
          delete resource._id;
          resource.sourceId = _id;

          Resources.insert( resource );
        }
      }
    }

    function copyResource( resource ) {
      delete resource._id;
      delete resource.snapshot;

      Resources.insert( resource );
    }
  },
  deleteSnapshot: function( name ) {
    var query = {},
        fields = {
          _id: true
        },
        sourceIds = [], 
        tagChatRoomSourceIds = [];

    if( name === 'current content' ) {
      query.snapshot = { $exists: false };
    } else query.snapshot = Snapshots.findOne( { name: name } )._id;

    Needs.find( query ).forEach( getId );
    
    TagChatRooms.find ( query ).forEach( getTagChatRoomId );
    
    Needs.remove( query );
    Resources.remove( query );
  
    TagChatRooms.remove ( query );
 
    ChatMessages.remove( { sourceId : { $in: sourceIds } } );
    // JF 2016-04-22
    TagChatMessages.remove( { sourceId : { $in: tagChatRoomSourceIds } } );
    // /JF
    Resources.remove( { sourceId: { $in: sourceIds } } );

    if( name !== 'current content' ) Snapshots.remove( { name: name } );

    function getId( need ) {
      sourceIds.push( need._id );
    }

    function getTagChatRoomId( tagChatRoom ) {
      tagChatRoomSourceIds.push( tagChatRoom._id );
    }
  },
  timeOffsetSnapshot: function( name, offsetAndUnit ) {
    var query = {},
        split = offsetAndUnit.split( ' ' ),
        offset = parseInt( split.shift(), 10 ),
        unit = split.shift();

    if( name === 'current content' ) query.snapshot = { $exists: false };
    else query.snapshot = Snapshots.findOne( { name: name } )._id;

    Needs.find( query ).forEach( updateNeedAndChatMessages );
    Resources.find( query ).forEach( updateResource );

    function updateNeedAndChatMessages( need ) {
      Needs.update( { _id: need._id }, { $set: { created: offsetDate( need.created ) } } );
      ChatMessages.find( { sourceId: need._id } ).forEach( updateChatMessage );
      // JF 2016-04-22
      TagChatMessages.find( { sourceId: need._id } ).forEach( updateTagChatMessage );
      //
      Resources.find( { sourceId: need._id } ).forEach( updateResource );
    }

    function updateChatMessage( chatmessage ) {
      ChatMessages.update( { _id: chatmessage._id }, { $set: { created: offsetDate( chatmessage.created ) } } );
    }

    // JF 2016-04-22
    function updateTagChatMessage( chatmessage ) {
      TagChatMessages.update( { _id: chatmessage._id }, { $set: { created: offsetDate( chatmessage.created ) } } );
    }
    // /JF

    function updateResource( resource ) {
      Resources.update( { _id: resource._id }, { $set: { created: offsetDate( resource.created ) } } );
    }

    function offsetDate( date ) {
      var newDate = new Date( date );

      switch( unit ) {
        case 'Y': newDate.setFullYear( date.getFullYear() + offset ); break;
        case 'M': newDate.setMonth( date.getMonth() + offset ); break;
        case 'W': newDate.setDate( date.getDate() + offset * 7 ); break;
        case 'D': newDate.setDate( date.getDate() + offset ); break;
        case 'h': newDate.setHours( date.getHours() + offset ); break;
        case 'm': newDate.setMinutes( date.getMinutes() + offset ); break;
        case 's': newDate.setSeconds( date.getSeconds() + offset ); break;
      }

      return newDate;
    }
  },
  pretend: function( username ) {
    if( !isAllowed( 'pretend' ) ) return new Meteor.Error( 'not-authorized' );

    var ownUserId = Meteor.userId(),
        user = Meteor.users.findOne( { _id: Meteor.userId() } ),
        otherUserId = Meteor.users.findOne( { username: username } )._id,
        update = otherUserId === ownUserId ? { $unset: { pretend: true } } : { $set: { pretend: otherUserId } },
        previousUserId = user.pretend || ownUserId;

    Meteor.users.update( { _id: ownUserId }, update );

    arrayReplaceUpdate( Needs, 'inChat', previousUserId, otherUserId );
    arrayReplaceUpdate( Needs, 'writingMessage', previousUserId, otherUserId );
  }
} );

// to circumvent mongodb issue where you cannot push and pull to the same array in 1 update
// http://stackoverflow.com/questions/9823140/multiple-mongo-update-operator-in-a-single-statement
function arrayReplaceUpdate( collection, key, originalValue, newValue ) {
  var tempKey = key + 'Temp',
      tempKeyPart = {},
      originalQuery = {},
      secondQuery = tempKeyPart,
      update1 = { $pull: {}, $set: tempKeyPart },
      update2 = { $push: {}, $unset: tempKeyPart };

  originalQuery[ key ] = originalValue;
  update1.$pull[ key ] = originalValue;
  tempKeyPart[ tempKey ] = newValue;
  update2.$push[ key ] = newValue;

  collection.update( originalQuery, update1, { multi: true } );
  collection.update( secondQuery, update2, { multi: true } );
}

function Need( options ) {
  this.title = options.title;

  this.created = new Date();
  this.createdBy = options.createdBy || Meteor.userId();

  this.updated = new Date( this.created );

  // users that get notified when something happens in this thread
  this.subscribed = [ this.createdBy ];
  this.keywords = options.keywords || [];

  // // other needs this need needs to be met
  // this.requirements = options.requirements || [];
  this.inChat = options.inChat || [];
  this.writingMessage = options.writingMessage || [];
  
  // JF
  this.state = options.state;
  this.tags = options.tags;
  // JF 2016-04-22
  this.inTagChat = options.inTagChat || [];
  this.writingMessageTagChat = options.writingMessageTagChat || [];
  // /JF
  // /JF
  
  // 2016-09-29
  this.createdByUsername = options.createdByUsername;
  this.createdByAvatar = options.createdByAvatar;
  this.tagUsers = options.tagUsers || [];
  //
  
  // 2016-10-03
  this.textTags = options.textTags || '#';
  //
  
}

// JF 2016-08-22 TagChatRoom
function TagChatRoom( options ) {
  this.title = options.title;

  this.created = new Date();
  this.createdBy = options.createdBy || Meteor.userId();

  this.updated = new Date( this.created );

  // users that get notified when something happens in this thread
  this.subscribed = [ this.createdBy ];
  this.keywords = options.keywords || [];

  // // other needs this need needs to be met
  // this.requirements = options.requirements || [];
  this.inChat = options.inChat || [];
  this.writingMessage = options.writingMessage || [];
  
  // JF
  this.state = options.state;
  this.tags = options.tags;
  // JF 2016-04-22
  this.inTagChat = options.inTagChat || [];
  this.writingMessageTagChat = options.writingMessageTagChat || [];
  // /JF
  // /JF
}
// /JF 2016-08-22 TagChatRoom



function ChatMessage( options ) {
  this.text = options.text;
  this.created = options.created || new Date();
  this.createdBy = options.createdBy || Meteor.userId();
  this.sourceId = options.sourceId;
  this.autoGenerated = options.autoGenerated;
}

function Resource( options ) {
  this.value = options.value;
  this.created = new Date();
  this.createdBy = options.createdBy;
  // 2016-09-29
  this.createdByUsername = options.createdByUsername;
  this.createdByAvater = options.createdByAvatar;
  //
  if( options.sourceId ) this.sourceId = options.sourceId;
}

function Snapshot( name ) {
  this.name = name;
  this.created = new Date();
  this.createdBy = Meteor.userId();
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

        console.log ("---getTagNeedIDs---")
        console.log ("tempTags: ".concat(tempTags));

        var countNeedIDs = 0;
        var userNames = '';
        var needIDsArray = [];
           
        tempNeedsWithSameTag.forEach(function(doc){
        
            var tempNeedId = doc._id;            
                        
            needIDsArray.push(tempNeedId);
                
            countNeedIDs = countNeedIDs+1;
            console.log ("Need ID: ".concat(tempNeedId));
            
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



// JF 2016-04-24
// returns needs with the specified tags
function getTagNeeds( tags ) {

    var tempTags = tags;

    if (tempTags.length < 1) { 
        return null;
    } else {
        
        // find other needs with the same tag(s) 

        var selector1 = {snapshot: { $exists: false } };
        var selector2 = {tags: {$in:tempTags}};
        
                        // return only the field _id 
        //var options = {fields: {_id: 1}};
        
        //var tempNeedsWithSameTag = Needs.find( { $and: [selector1, selector2, selector3]}, options);
        var tempNeedsWithSameTag = Needs.find( { $and: [selector1, selector2]});

        console.log ("---getTagNeeds---")
        console.log ("tempTags: ".concat(tempTags));

        var countNeedIDs = 0;
        var userNames = '';
        var needsArray = [];
           
        tempNeedsWithSameTag.forEach(function(doc){
        
            var tempNeed = doc;            
                        
            needsArray.push(tempNeed);
                
            countNeedIDs = countNeedIDs+1;
            console.log ("Need: ".concat(tempNeed));
            
        });
        
        if (countNeedIDs > 0) {
            
            // no double needIDs
            //needIDsArray = _.uniq(needIDsArray);
                        
            return needsArray;
        } else {
            return null;
        }
    }
}
// /JF





