function Invoke-HueLightSwitch {
   <#
    .SYNOPSIS
        Invokes an light state action against a series of lights based on the device ID.
    .DESCRIPTION
        Calls the `/lights/setlightstate` API endpoint. 
   .EXAMPLE        
        # Invoke-HueLightSwitch -LightIdArray $array -Color "none" -Alert -Hue 65535 -Saturation 100
        # Invoke-HueLightSwitch -LightIdArray $array -Color "green" -Alert
        # Invoke-HueLightSwitch -LightIdArray $array -Color "blue" -Alert
        # Invoke-HueLightSwitch -LightIdArray $array -Color "red" -Alert 
        # Invoke-HueLightSwitch -LightIdArray $array -Color "pink" -Alert
        # Invoke-HueLightSwitch -LightIdArray $array -Color "yellow" -Alert
    #>

    [CmdletBinding()]
    param (

        [Parameter(Mandatory = $false)]
        [string]$ExpressApiEndpoint = "http://localhost:9000/lights/setlightstate",

        [Parameter(Mandatory = $true)]
        [array]$LightIdArray,
        
        [Parameter(Mandatory = $false)]
        [string]$Color = "default",

        # int is from 1 to 65535
        [Parameter(Mandatory = $false)]
        [int]$Hue,

        # int is from 1 to 100   
        [Parameter(Mandatory = $false)]
        [int]$Saturation,

        # int is from 1 to 100   
        [Parameter(Mandatory = $false)]
        [int]$Brightness,        

        [Parameter(Mandatory = $false)]
        [bool]$OnState = $true,

        [Parameter(Mandatory = $false)]
        [switch]$Alert
        
    )
    
    begin {
        $body = @{ 
            lightids   = $LightIdArray; 
            onstate    = $OnState; 
        }

        if($Color -ne "default"){
            $body += @{  colorstate = $Color;  }
        }

        if($Hue -ne 0){
            $body += @{ hue = $Hue;  }
        }

        if($Saturation -ne 0){
            $body += @{ saturation = $Saturation;  }
        }
        
        if($Brightness -ne 0){
            $body += @{ brightness = $Brightness;  }
        }

        if($Alert){
            $body += @{ alert = $true }
        }
    }
    
    process {
        $response = Invoke-WebRequest $ExpressApiEndpoint `
            -Method Post `
            -ContentType "application/json" `
            -Body ($body | ConvertTo-Json) -UseBasicParsing
    }
    
    end {
        Write-Host "`n`t> Response from '$ExpressApiEndpoint': $response" 
    }
}