from django import forms

class CustomModelForm(forms.ModelForm):
    """
    统一定制ModelForm类的样式
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for name, field in self.fields.items():
            field.widget.attrs['class'] = 'layui-input'
