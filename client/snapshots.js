Template.snapshots.helpers( {
  getSelectedSnapshot: getSelectedSnapshot,
  activesnapshot: activesnapshot
} );

Template.snapshots.events( {
  'click aside.snapshot-list li:not(.active)': clickSnapshot,
  'keyup input.save': saveFieldKeyup,
  'click aside button.delete': clickDeleteSnapshot,
  'click button.load': clickLoad,
  'click section button.delete': clickDeleteItem,
  'click section span.name': clickItemName,
  'input section li p': contentEdit,
  'click section span.datetime': clickDateTime
} );

function getSelectedSnapshot() {
  var selectedSnapshotName = Session.get( 'selected snapshot' ),
      selectedSnapshot;

  if( selectedSnapshotName ) {
    selectedSnapshot = this.snapshots().find( function( snapshot ) { return snapshot.name === selectedSnapshotName; } );
    if( selectedSnapshot ) return selectedSnapshot;
  }

  return this.snapshots()[ 0 ];
}

function activesnapshot() {
  var selectedSnapshotName = Session.get( 'selected snapshot' ),
      isActive;

  if( selectedSnapshotName ) isActive = this.name === selectedSnapshotName;
  else isActive = this.name === 'current content';

  return isActive ? ' active' : '';
}

function clickSnapshot( event ) {
  Session.set( 'selected snapshot', this.name );
}

function saveFieldKeyup( event ) {
  var name = getValueIfReturnKey( event, true ); // clear = true
  if( !name ) return;

  Meteor.call( 'copyToSnapshot', name, this._id );

  Session.set( 'selected snapshot', name );
}

function clickLoad( event ) {
  Meteor.call( 'loadSnapshot', this.name );
  Session.set( 'selected snapshot', null );
}

function clickDeleteSnapshot( event ) {
  Meteor.call( 'deleteSnapshot', this.name );
  Session.set( 'selected snapshot', null );
}

function clickDeleteItem( event ) {
  switch( this.type ) {
    case 'need': return Meteor.call( 'deleteNeed', this._id );
    case 'chatmessage': return Meteor.call( 'deleteChatMessage', this._id );
  }
}

function clickItemName( event ) {
  var item = this,
      name = event.target.textContent,
      parent = event.target.parentNode,
      input = document.createElement( 'input' ),
      datalist = document.createElement( 'datalist' ),
      users = {};

  Meteor.users.find( {} ).forEach( createOption );

  datalist.id = 'usernames';

  document.body.appendChild( datalist );

  input.setAttribute( 'list', 'usernames' );
  input.className = 'name';
  parent.replaceChild( input, event.target );

  input.addEventListener( 'blur', inputBlur);
  input.addEventListener( 'keyup', inputKeyup );

  input.focus();

  function createOption( user ) {
    var option = document.createElement( 'option' );
    option.value = user.username;
    option.textContent = user._id;

    users[ user.username.toLowerCase() ] = user._id;

    datalist.appendChild( option );
  }

  function inputBlur( event ) {
    var span = document.createElement( 'span' );
    span.textContent = name;
    span.className = 'name';
    parent.replaceChild( span, input );

    datalist.parentNode.removeChild( datalist );
  }

  function inputKeyup( event ) {
    var value = getValueIfReturnKey( event );
    if( value) {
      value = value.toLowerCase();
      if( users [ value ] ) {
        name = value;
        if( item.type === 'need' ) Meteor.call( 'changeNeedOwner', item._id, users[ value ] );
        if( item.type === 'chatmessage' ) Meteor.call( 'changeChatMessageOwner', item._id, users[ value ] );
        input.blur();
      } else {
        input.style.border = '1px solid red';
      }
    }
  }
}

function clickDateTime( event ) {
  var item = this,
      type = this.type,
      created = this.created,
      parent = event.target.parentNode,
      input = document.createElement( 'input' );

  input.type = 'datetime-local';
  input.value = created.toISOString();

  parent.replaceChild( input, event.target );

  var timezoneOffset = created.getTimezoneOffset() * 60 * 1000,
      localDate = new Date( created.getTime() - timezoneOffset );

  console.log( { localDate: localDate, created: created } );

  input.value = localDate.toISOString().replace( 'Z', '' );

  input.addEventListener( 'keyup', inputKeyup );
  input.addEventListener( 'blur', inputBlur );

  input.focus();

  var removing;

  function inputKeyup( event ) {
    if( event.keyCode === 27 ) {
      return input.blur();
    }

    if( event.keyCode !== 13 ) return;
    if( removing ) return;
    removing = true;

    var date = new Date( input.value ),
        globalDate = new Date( date.getTime() + timezoneOffset ),
        span = document.createElement( 'span' );


    span.textContent = formatTime( globalDate );
    span.className = 'datetime';

    parent.replaceChild( span, input );

    if( type === 'need' ) Meteor.call( 'changeNeedCreated', item._id, globalDate );
    if( type === 'chatmessage' ) Meteor.call( 'changeChatMessageCreated', item._id, globalDate );
  }

  function inputBlur() {
    if( removing ) return;
    removing = true;

    var span = document.createElement( 'span' );

    span.textContent = formatTime( created );
    span.className = 'datetime';

    parent.replaceChild( span, input );
  }
}

var storeEditTimeout;

function contentEdit( event ) {
  var id = this._id,
      type = this.type,
      content = event.target.textContent;

  clearTimeout( storeEditTimeout );
  storeEditTimeout = setTimeout( storeEdit, 1000 );

  function storeEdit() {
    if( type === 'need' ) return Meteor.call( 'changeNeedTitle', id, content );
    if( type === 'chatmessage' ) return Meteor.call( 'changeChatMessageText', id, content );
  }
}
