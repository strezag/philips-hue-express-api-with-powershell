function Get-HueLightsList {

    <#
    .SYNOPSIS
        Gets the list of registered lights from the Hue Bridge. 
    .DESCRIPTION
        This function will call the /lights endpoint of the application. 
   .EXAMPLE        
        Get-HueLightsList 
        Get-HueLightsList -OutGridView
        Get-HueLightsList  - ExcludeUnreachable
    #>

    [CmdletBinding()]
    param (

        [Parameter(Mandatory = $false)]
        [string]$ExpressApiEndpoint = "http://localhost:9000/lights/",
    
        [Parameter(Mandatory = $false)]
        [switch]$ExcludeUnreachable,

        [Parameter(Mandatory = $false)]
        [switch]$OutGridView

    )

    $deviceList = Invoke-WebRequest $ExpressApiEndpoint `
        -Method Get `
        -ContentType "application/json" | ConvertFrom-Json  
    
    $ReachableDevices = @()

    if ($ExcludeUnreachable) {
        $deviceList = $deviceList | Where-Object { $_._data.state.reachable -eq $true }
    }

    foreach ($reachableDevice in $deviceList) {
        $obj = New-Object PSObject
        Add-Member -InputObject $obj -MemberType NoteProperty -Name DeviceName -Value $reachableDevice._data.name
        Add-Member -InputObject $obj -MemberType NoteProperty -Name ProductName -Value $reachableDevice._data.productname
        Add-Member -InputObject $obj -MemberType NoteProperty -Name ModelNumber -Value $reachableDevice._data.modelid
        Add-Member -InputObject $obj -MemberType NoteProperty -Name ColorMode -Value $reachableDevice._data.state.colormode
        Add-Member -InputObject $obj -MemberType NoteProperty -Name Brightness -Value $reachableDevice._data.state.bri
        Add-Member -InputObject $obj -MemberType NoteProperty -Name Hue -Value $reachableDevice._data.state.hue
        Add-Member -InputObject $obj -MemberType NoteProperty -Name Saturation -Value $reachableDevice._data.state.sat
        Add-Member -InputObject $obj -MemberType NoteProperty -Name OnState -Value $reachableDevice._data.state.on
        Add-Member -InputObject $obj -MemberType NoteProperty -Name Reachable -Value $reachableDevice._data.state.reachable
        Add-Member -InputObject $obj -MemberType NoteProperty -Name DeviceID -Value $reachableDevice._data.id
        $ReachableDevices += $obj
    }

    $ReachableDevices | Sort-Object { $_.DeviceName } | Format-Table DeviceName, DeviceID, ProductName, ModelNumber, ColorMode, Brightness, Hue, Saturation, OnState, Reachable -AutoSize

    if ($OutGridView -eq $true) {
        $ReachableDevices | Sort-Object { $_.DeviceName } | Out-GridView
    }
}