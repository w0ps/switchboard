var needsFeedWidth = 350,
		needsFeedWindow;

Template.root.events( {
	'click a[href="/needs"]': openNeeds
} );

function openNeeds( event ) {
	event.preventDefault();

	needsFeedWindow = window.open( '/needs', 'needs', 'height=' + window.innerHeight + ',width=' + needsFeedWidth );

	return false;
}
