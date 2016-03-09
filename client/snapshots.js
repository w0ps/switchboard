Template.snapshots.helpers( {
  getSelectedSnapshot: getSelectedSnapshot,
  activesnapshot: activesnapshot
} );

Template.snapshots.events( {
  'click aside.snapshot-list li:not(.active)': clickSnapshot,
  'keyup input.save': saveFieldKeyup,
  'click button.delete': clickDelete,
  'click button.load': clickLoad
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

function clickDelete( event ) {
  Meteor.call( 'deleteSnapshot', this.name );
  Session.set( 'selected snapshot', null );
}

function clickLoad( event ) {
  Meteor.call( 'loadSnapshot', this.name );
  Session.set( 'selected snapshot', null );
}
