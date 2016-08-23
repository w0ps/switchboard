// http://meteortips.com/second-meteor-tutorial/validation/
// themeteorchef:jquery-validation

Template.register.events({
    'submit .register-form': function (event) {

        event.preventDefault();

    }
});

Template.register.onRendered(function(){
    var validator = $('.register-form').validate({
        rules: {
            username: {
                required: true,
                minlength: 3
            },
            password: {
                required: true,
                minlength: 6
            },
            password2: {
                required: true,
                equalTo: "#password"
            }
        },
        messages: {
            username: {
                required: "You must enter a username.",
                minlength: "Your username must be at least {0} characters."                
            },
            password: {
                required: "You must enter a password.",
                minlength: "Your password must be at least {0} characters."
            },
            password2: {
                required: "You must re-enter the password.",
                minlength: "Your password must be at least {0} characters.",
                equalTo: "Passwords don't match."
            }
        },
        submitHandler: function(event){
            var username = $('[name=username]').val();
            var password = $('[name=password]').val();
            Accounts.createUser({
                username: username,
                password: password
            }, function(error){
                if(error){
                        console.log("user_register.js - validate.submitHandler - error:" + error.reason);
                        
                        if(error.reason == "Username already exists."){
                            validator.showErrors({username: error.reason});
                            }
                } else {
                    Router.go("/register2");
                }
            });
        }    

    });
});

