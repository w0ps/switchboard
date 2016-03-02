var needsFeedWidth = 350,
		needsFeedWindow;

Template.root.events( {
	'click a[href="/needs"]': openNeeds
} );

function openNeeds( event ) {
	event.preventDefault();

	return false;
}
