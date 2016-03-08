Template.snapshots.helpers( {
	getSelectedSnapshot: function() {
		var selectedSnapshotName = Session.get( 'selected snapshot' ),
				selectedSnapshot;

		if( selectedSnapshotName ) {
			selectedSnapshot = this.snapshots().find( function( snapshot ) { return snapshot.name === selectedSnapshotName; } );
			if( selectedSnapshot ) return selectedSnapshot;
		}

		return this.snapshots()[ 0 ];
	}
} );
